#!/bin/bash
# Stop WiFi Access Point and clean up all resources
set -euo pipefail

# ── Firewall: remove cockpit-wifi-ap nft table (or iptables rules) ──
if command -v nft >/dev/null 2>&1; then
    nft delete table inet cockpit-wifi-ap 2>/dev/null || true
fi
# iptables fallback cleanup
if command -v iptables >/dev/null 2>&1; then
    while iptables -S INPUT 2>/dev/null | grep -q "cockpit-wifi-ap"; do
        RULE=$(iptables -S INPUT 2>/dev/null | grep "cockpit-wifi-ap" | head -1 | sed 's/^-A //')
        iptables -D INPUT $RULE 2>/dev/null || break
    done
fi

# Remove AP dnsmasq config and reload system dnsmasq
rm -f /etc/dnsmasq.d/cockpit-wifi-ap.conf
rm -f /etc/NetworkManager/dnsmasq-shared.d/cockpit-wifi-ap.conf
systemctl restart dnsmasq.service 2>/dev/null || true

# Legacy: kill any leftover dedicated dnsmasq instance
if [ -f /run/cockpit-wifi-ap-dnsmasq.pid ]; then
    kill "$(cat /run/cockpit-wifi-ap-dnsmasq.pid)" 2>/dev/null || true
    rm -f /run/cockpit-wifi-ap-dnsmasq.pid
fi

# Bring down and delete AP connection
nmcli connection down cockpit-wifi-ap 2>/dev/null || true
nmcli connection delete cockpit-wifi-ap 2>/dev/null || true

# Clean up bridge resources (bridge mode)
nmcli connection down cockpit-wifi-br0-port-eth 2>/dev/null || true
nmcli connection delete cockpit-wifi-br0-port-eth 2>/dev/null || true
nmcli connection down cockpit-wifi-br0 2>/dev/null || true
nmcli connection delete cockpit-wifi-br0 2>/dev/null || true

# Clean up ONLY our iptables rules (tagged with "cockpit-wifi-ap" comment)
while iptables -t nat -S POSTROUTING 2>/dev/null | grep -q "cockpit-wifi-ap"; do
    RULE_NUM=$(iptables -t nat -L POSTROUTING --line-numbers -n 2>/dev/null | grep "cockpit-wifi-ap" | head -1 | awk '{print $1}')
    [ -n "$RULE_NUM" ] && iptables -t nat -D POSTROUTING "$RULE_NUM" || break
done

while iptables -S FORWARD 2>/dev/null | grep -q "cockpit-wifi-ap"; do
    RULE_NUM=$(iptables -L FORWARD --line-numbers -n 2>/dev/null | grep "cockpit-wifi-ap" | head -1 | awk '{print $1}')
    [ -n "$RULE_NUM" ] && iptables -D FORWARD "$RULE_NUM" || break
done

# Mark disabled in config and disable systemd service
# Skip if called as ExecStop during system shutdown (preserve enabled state for next boot)
CONFIG_FILE="/etc/cockpit-wifi-ap/ap.conf"
SYSTEM_STATE=$(systemctl is-system-running 2>/dev/null || echo "unknown")
if echo "$SYSTEM_STATE" | grep -qvE 'stopping|offline|maintenance'; then
    if [ -f "$CONFIG_FILE" ]; then
        python3 -c "
import json
with open('${CONFIG_FILE}') as f:
    c = json.load(f)
c['enabled'] = False
with open('${CONFIG_FILE}', 'w') as f:
    json.dump(c, f, indent=2)
"
    fi
    systemctl disable cockpit-wifi-ap.service 2>/dev/null || true
fi

echo '{"success": true}'
