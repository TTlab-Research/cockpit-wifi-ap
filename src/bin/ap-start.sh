#!/bin/bash
# Start WiFi Access Point using NetworkManager + dnsmasq
set -euo pipefail

CONFIG_FILE="/etc/cockpit-wifi/ap.conf"

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
AP_IFACE=$(read_config interface "")
AP_MODE=$(read_config mode "router")
AP_BRIDGE_IFACE=$(read_config bridgeInterface "")
AP_DHCP_START=$(read_config dhcpRangeStart "192.168.4.20")
AP_DHCP_END=$(read_config dhcpRangeEnd "192.168.4.252")

if [ -z "$AP_SSID" ] || [ -z "$AP_PASS" ] || [ -z "$AP_IFACE" ]; then
    echo '{"error": "Missing required config: ssid, passphrase, or interface"}' >&2
    exit 1
fi

if [ "$AP_MODE" = "bridge" ] && [ -z "$AP_BRIDGE_IFACE" ]; then
    echo '{"error": "Bridge mode requires a bridge interface to be specified"}' >&2
    exit 1
fi

# Cleanup any previous AP resources
nmcli connection down cockpit-wifi-ap 2>/dev/null || true
nmcli connection delete cockpit-wifi-ap 2>/dev/null || true
nmcli connection down cockpit-wifi-br0 2>/dev/null || true
nmcli connection delete cockpit-wifi-br0 2>/dev/null || true
nmcli connection delete cockpit-wifi-br0-port-eth 2>/dev/null || true

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
            wifi.channel "$AP_CHANNEL" \
            ipv4.method manual \
            ipv4.addresses "${AP_ADDR}/24"

        nmcli connection modify cockpit-wifi-ap \
            wifi-sec.key-mgmt wpa-psk \
            wifi-sec.psk "$AP_PASS"

        # Enable IP forwarding
        sysctl -w net.ipv4.ip_forward=1

        # Configure dnsmasq: full DHCP with gateway + DNS
        mkdir -p /etc/dnsmasq.d
        cat > /etc/dnsmasq.d/cockpit-wifi-ap.conf <<EOF
interface=$AP_IFACE
dhcp-range=${AP_DHCP_START},${AP_DHCP_END},255.255.255.0,8h
dhcp-option=3,${AP_ADDR}
dhcp-option=6,${AP_ADDR}
bind-interfaces
EOF
        systemctl restart dnsmasq 2>/dev/null || true

        # NAT masquerading
        DEFAULT_IFACE=$(ip route show default | awk '/default/ {print $5}' | head -1)
        if [ -n "$DEFAULT_IFACE" ]; then
            iptables -t nat -A POSTROUTING -o "$DEFAULT_IFACE" -j MASQUERADE -m comment --comment "cockpit-wifi-ap"
            iptables -A FORWARD -i "$AP_IFACE" -o "$DEFAULT_IFACE" -j ACCEPT -m comment --comment "cockpit-wifi-ap"
            iptables -A FORWARD -i "$DEFAULT_IFACE" -o "$AP_IFACE" -m state --state RELATED,ESTABLISHED -j ACCEPT -m comment --comment "cockpit-wifi-ap"
        fi

        nmcli connection up cockpit-wifi-ap
        ;;

    isolated)
        # ── Isolated network: AP + DHCP (IP only, no gateway/DNS) ──
        nmcli connection add \
            type wifi \
            ifname "$AP_IFACE" \
            con-name cockpit-wifi-ap \
            ssid "$AP_SSID" \
            autoconnect no \
            wifi.mode ap \
            wifi.channel "$AP_CHANNEL" \
            ipv4.method manual \
            ipv4.addresses "${AP_ADDR}/24"

        nmcli connection modify cockpit-wifi-ap \
            wifi-sec.key-mgmt wpa-psk \
            wifi-sec.psk "$AP_PASS"

        # Configure dnsmasq: DHCP with IP only, no gateway, no DNS
        mkdir -p /etc/dnsmasq.d
        cat > /etc/dnsmasq.d/cockpit-wifi-ap.conf <<EOF
interface=$AP_IFACE
dhcp-range=${AP_DHCP_START},${AP_DHCP_END},255.255.255.0,8h
# No dhcp-option=3 (gateway) -> client won't add a default route
# No dhcp-option=6 (DNS) -> client won't use this for DNS
bind-interfaces
EOF
        systemctl restart dnsmasq 2>/dev/null || true

        nmcli connection up cockpit-wifi-ap
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
            wifi.channel "$AP_CHANNEL" \
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

echo '{"success": true}'
