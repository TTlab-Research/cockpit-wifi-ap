#!/bin/bash
# Start WiFi Access Point using NetworkManager + system dnsmasq
set -euo pipefail

CONFIG_FILE="/etc/cockpit-wifi-ap/ap.conf"

if [ ! -f "$CONFIG_FILE" ]; then
    echo '{"error": "No AP configuration found. Save configuration first."}' >&2
    exit 1
fi

# Parse JSON config safely via python3+json (no eval)
read_config() {
    python3 -c "
import json, sys
with open('${CONFIG_FILE}') as f:
    c = json.load(f)
print(c.get('$1', '$2'))
"
}

AP_SSID=$(read_config ssid "")
AP_PASS=$(read_config passphrase "")
AP_ADDR=$(read_config address "192.168.4.1")
AP_CHANNEL=$(read_config channel "6")
AP_BAND=$(read_config band "auto")
AP_IFACE=$(read_config interface "")
AP_MODE=$(read_config mode "router")
AP_BRIDGE_IFACE=$(read_config bridgeInterface "")
AP_DHCP_START=$(read_config dhcpRangeStart "192.168.4.20")
AP_DHCP_END=$(read_config dhcpRangeEnd "192.168.4.252")
AP_COUNTRY=$(read_config countryCode "IT")

# Set regulatory domain from config
sudo iw reg set "$AP_COUNTRY" 2>/dev/null || true

# nmcli uses "bg" for 2.4GHz and "a" for 5GHz.
# "auto" or channel "auto" defaults to bg/6 to avoid wpa_supplicant timeout.
case "$AP_BAND" in
    2.4GHz)
        if [ "$AP_CHANNEL" = "auto" ]; then
            NM_BAND_ARGS="wifi.band bg"
        else
            NM_BAND_ARGS="wifi.band bg wifi.channel ${AP_CHANNEL}"
        fi
        ;;
    5GHz)
        if [ "$AP_CHANNEL" = "auto" ]; then
            NM_BAND_ARGS="wifi.band a"
        else
            NM_BAND_ARGS="wifi.band a wifi.channel ${AP_CHANNEL}"
        fi
        ;;
    *)
        NM_BAND_ARGS="wifi.band bg wifi.channel 6"
        ;;
esac

if [ -z "$AP_SSID" ] || [ -z "$AP_PASS" ] || [ -z "$AP_IFACE" ]; then
    echo '{"error": "Missing required config: ssid, passphrase, or interface"}' >&2
    exit 1
fi

if [ "$AP_MODE" = "bridge" ] && [ -z "$AP_BRIDGE_IFACE" ]; then
    echo '{"error": "Bridge mode requires a bridge interface to be specified"}' >&2
    exit 1
fi

# ── Ensure system dnsmasq can coexist with systemd-resolved ──
# bind-interfaces: bind only to specific interfaces, not 0.0.0.0
# except-interface=lo: never bind to loopback (used by systemd-resolved)
DNSMASQ_CONF="/etc/dnsmasq.conf"
if ! grep -q "^bind-interfaces" "$DNSMASQ_CONF" 2>/dev/null; then
    echo "bind-interfaces" >> "$DNSMASQ_CONF"
fi
if ! grep -q "^except-interface=lo" "$DNSMASQ_CONF" 2>/dev/null; then
    echo "except-interface=lo" >> "$DNSMASQ_CONF"
fi

# ── Firewall: open DHCP port via dedicated nft table (fallback: iptables) ──
# Uses a separate table so we never touch the user's existing ruleset.
open_firewall() {
    if command -v nft >/dev/null 2>&1; then
        nft delete table inet cockpit-wifi-ap 2>/dev/null || true
        nft add table inet cockpit-wifi-ap
        nft add chain inet cockpit-wifi-ap input \
            '{ type filter hook input priority filter - 1; policy accept; }'
        # DHCP server (router/isolated modes)
        nft add rule inet cockpit-wifi-ap input udp dport 67 accept
        # DNS on AP interface
        nft add rule inet cockpit-wifi-ap input iifname "$AP_IFACE" tcp dport 53 accept
        nft add rule inet cockpit-wifi-ap input iifname "$AP_IFACE" udp dport 53 accept
        # Allow all traffic from AP clients to reach host services (e.g. Caddy on 80/443)
        nft add rule inet cockpit-wifi-ap input iifname "$AP_IFACE" accept
        if [ "$AP_MODE" = "router" ]; then
            # Allow forwarding from AP to internet
            nft add chain inet cockpit-wifi-ap forward \
                '{ type filter hook forward priority filter - 1; policy accept; }'
        fi
    elif command -v iptables >/dev/null 2>&1; then
        iptables -I INPUT -p udp --dport 67 -j ACCEPT -m comment --comment "cockpit-wifi-ap" 2>/dev/null || true
        iptables -I INPUT -i "$AP_IFACE" -p tcp --dport 53 -j ACCEPT -m comment --comment "cockpit-wifi-ap" 2>/dev/null || true
        iptables -I INPUT -i "$AP_IFACE" -p udp --dport 53 -j ACCEPT -m comment --comment "cockpit-wifi-ap" 2>/dev/null || true
    fi
}

# ── Cleanup: previous AP resources and conflicting dnsmasq configs ──
nmcli connection down cockpit-wifi-ap 2>/dev/null || true
nmcli connection delete cockpit-wifi-ap 2>/dev/null || true
nmcli connection down cockpit-wifi-br0 2>/dev/null || true
nmcli connection delete cockpit-wifi-br0 2>/dev/null || true
nmcli connection delete cockpit-wifi-br0-port-eth 2>/dev/null || true

# Remove any leftover NM dnsmasq-shared.d config (caused bind-dynamic conflict)
rm -f /etc/NetworkManager/dnsmasq-shared.d/cockpit-wifi-ap.conf

# Remove any leftover dedicated dnsmasq pid (legacy)
if [ -f /run/cockpit-wifi-ap-dnsmasq.pid ]; then
    kill "$(cat /run/cockpit-wifi-ap-dnsmasq.pid)" 2>/dev/null || true
    rm -f /run/cockpit-wifi-ap-dnsmasq.pid
fi

# ── Helper: write dnsmasq config and restart system service ──
# Writes to /etc/dnsmasq.d/cockpit-wifi-ap.conf then restarts dnsmasq.service.
# bind-interfaces (set above in dnsmasq.conf) ensures no conflict with systemd-resolved.
start_dnsmasq() {
    local extra_conf="$1"
    DEVICE_HOSTNAME=$(hostname)
    cat > /etc/dnsmasq.d/cockpit-wifi-ap.conf << EOF
# Managed by cockpit-wifi-ap — do not edit manually
interface=${AP_IFACE}
dhcp-range=${AP_DHCP_START},${AP_DHCP_END},255.255.255.0,8h
dhcp-option=6,${AP_ADDR}
address=/${DEVICE_HOSTNAME}.local/${AP_ADDR}
no-resolv
no-hosts
${extra_conf}
EOF
    systemctl enable dnsmasq.service 2>/dev/null || true
    systemctl restart dnsmasq.service
}

case "$AP_MODE" in

    router)
        # ── Full router: AP + DHCP (IP+gateway+DNS) + NAT ──
        nmcli connection add \
            type wifi \
            ifname "$AP_IFACE" \
            con-name cockpit-wifi-ap \
            ssid "$AP_SSID" \
            autoconnect no \
            wifi.mode ap \
            $NM_BAND_ARGS \
            ipv4.method manual \
            ipv4.addresses "${AP_ADDR}/24" \
            wifi-sec.key-mgmt wpa-psk \
            wifi-sec.auth-alg open \
            wifi-sec.psk "$AP_PASS"

        # Enable IP forwarding
        sysctl -w net.ipv4.ip_forward=1

        # Bring up AP first so the interface exists when dnsmasq starts
        nmcli connection up cockpit-wifi-ap

        # Wait for interface to be fully up (max 10s)
        for i in $(seq 1 10); do
            ip link show "$AP_IFACE" | grep -q "UP" && break
            sleep 1
        done

        # Route clients through AP; upstream DNS relayed via dnsmasq
        DEFAULT_IFACE=$(ip route show default | awk '/default/ {print $5}' | head -1)
        UPSTREAM_DNS="8.8.8.8"
        [ -n "$DEFAULT_IFACE" ] && UPSTREAM_DNS=$(resolvectl dns "$DEFAULT_IFACE" 2>/dev/null | awk '{print $NF}' | head -1) || true
        [ -z "$UPSTREAM_DNS" ] && UPSTREAM_DNS="8.8.8.8"

        open_firewall

        # dhcp-option=3 = gateway (this device), server = upstream DNS
        start_dnsmasq "dhcp-option=3,${AP_ADDR}
server=${UPSTREAM_DNS}"

        # NAT masquerading
        if [ -n "$DEFAULT_IFACE" ]; then
            iptables -t nat -A POSTROUTING -o "$DEFAULT_IFACE" -j MASQUERADE -m comment --comment "cockpit-wifi-ap"
            iptables -A FORWARD -i "$AP_IFACE" -o "$DEFAULT_IFACE" -j ACCEPT -m comment --comment "cockpit-wifi-ap"
            iptables -A FORWARD -i "$DEFAULT_IFACE" -o "$AP_IFACE" -m state --state RELATED,ESTABLISHED -j ACCEPT -m comment --comment "cockpit-wifi-ap"
        fi
        ;;

    isolated)
        # ── Isolated network: AP + DHCP (IP only, no gateway/DNS to internet) ──
        nmcli connection add \
            type wifi \
            ifname "$AP_IFACE" \
            con-name cockpit-wifi-ap \
            ssid "$AP_SSID" \
            autoconnect no \
            wifi.mode ap \
            $NM_BAND_ARGS \
            ipv4.method manual \
            ipv4.addresses "${AP_ADDR}/24" \
            wifi-sec.key-mgmt wpa-psk \
            wifi-sec.auth-alg open \
            wifi-sec.psk "$AP_PASS"

        # Bring up AP first so the interface exists when dnsmasq starts
        nmcli connection up cockpit-wifi-ap

        # Wait for interface to be fully up (max 10s)
        for i in $(seq 1 10); do
            ip link show "$AP_IFACE" | grep -q "UP" && break
            sleep 1
        done

        open_firewall

        # dhcp-option=3 empty = suppress default gateway (clients get IP only)
        start_dnsmasq "dhcp-option=3"
        ;;

    bridge)
        # ── Bridge mode: AP bridged to ethernet, external DHCP ──
        # 1. Create the bridge
        nmcli connection add \
            type bridge \
            con-name cockpit-wifi-br0 \
            ifname cockpit-wifi-br0 \
            bridge.stp no \
            ipv4.method manual \
            ipv4.addresses "${AP_ADDR}/24"

        # 2. Add the ethernet interface as a bridge port
        nmcli connection add \
            type ethernet \
            ifname "$AP_BRIDGE_IFACE" \
            con-name cockpit-wifi-br0-port-eth \
            master cockpit-wifi-br0

        # 3. Create WiFi AP as a bridge slave
        nmcli connection add \
            type wifi \
            ifname "$AP_IFACE" \
            con-name cockpit-wifi-ap \
            ssid "$AP_SSID" \
            autoconnect no \
            wifi.mode ap \
            $NM_BAND_ARGS \
            slave-type bridge \
            master cockpit-wifi-br0

        nmcli connection modify cockpit-wifi-ap \
            wifi-sec.key-mgmt wpa-psk \
            wifi-sec.psk "$AP_PASS"

        # 4. Bring everything up
        nmcli connection up cockpit-wifi-br0
        nmcli connection up cockpit-wifi-br0-port-eth
        nmcli connection up cockpit-wifi-ap
        ;;

    *)
        echo "{\"error\": \"Unknown AP mode: $AP_MODE\"}" >&2
        exit 1
        ;;
esac

# Workaround per PHY self-managed (iwlwifi): il dominio regolatorio si inizializza
# in modo asincrono al boot e la prima attivazione NM parte prima che la scheda
# sia pronta → beacon non trasmessi. Un bounce garantisce attivazione stabile.
if [ "$AP_MODE" != "bridge" ]; then
    sleep 1
    nmcli connection down cockpit-wifi-ap 2>/dev/null || true
    sleep 1
    nmcli connection up cockpit-wifi-ap
    for i in $(seq 1 10); do
        ip link show "$AP_IFACE" | grep -q "UP" && break
        sleep 1
    done
    systemctl restart dnsmasq.service 2>/dev/null || true
fi

# Mark enabled in config and enable systemd service for autostart on boot
python3 -c "
import json
with open('${CONFIG_FILE}') as f:
    c = json.load(f)
c['enabled'] = True
with open('${CONFIG_FILE}', 'w') as f:
    json.dump(c, f, indent=2)
"
systemctl enable cockpit-wifi-ap.service 2>/dev/null || true

echo '{"success": true}'
