#!/bin/bash
# Stop WiFi Access Point and clean up all resources
set -euo pipefail

# Bring down and delete AP connection
nmcli connection down cockpit-wifi-ap 2>/dev/null || true
nmcli connection delete cockpit-wifi-ap 2>/dev/null || true

# Clean up bridge resources (bridge mode)
nmcli connection down cockpit-wifi-br0-port-eth 2>/dev/null || true
nmcli connection delete cockpit-wifi-br0-port-eth 2>/dev/null || true
nmcli connection down cockpit-wifi-br0 2>/dev/null || true
nmcli connection delete cockpit-wifi-br0 2>/dev/null || true

# Remove dnsmasq config (router/isolated modes)
if [ -f /etc/dnsmasq.d/cockpit-wifi-ap.conf ]; then
    rm -f /etc/dnsmasq.d/cockpit-wifi-ap.conf
    systemctl restart dnsmasq 2>/dev/null || true
fi

# Clean up ONLY our iptables rules (tagged with "cockpit-wifi-ap" comment)
while iptables -t nat -S POSTROUTING 2>/dev/null | grep -q "cockpit-wifi-ap"; do
    RULE_NUM=$(iptables -t nat -L POSTROUTING --line-numbers -n 2>/dev/null | grep "cockpit-wifi-ap" | head -1 | awk '{print $1}')
    [ -n "$RULE_NUM" ] && iptables -t nat -D POSTROUTING "$RULE_NUM" || break
done

while iptables -S FORWARD 2>/dev/null | grep -q "cockpit-wifi-ap"; do
    RULE_NUM=$(iptables -L FORWARD --line-numbers -n 2>/dev/null | grep "cockpit-wifi-ap" | head -1 | awk '{print $1}')
    [ -n "$RULE_NUM" ] && iptables -D FORWARD "$RULE_NUM" || break
done

echo '{"success": true}'
