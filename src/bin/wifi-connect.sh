#!/bin/bash
# Connect to a WiFi network using NetworkManager
set -euo pipefail

SSID="${1:?Usage: wifi-connect.sh <SSID>}"

# Read password from stdin (avoid exposing in ps aux)
read -r PASSWORD

# Validate inputs
if [ ${#SSID} -lt 1 ] || [ ${#SSID} -gt 32 ]; then
    echo '{"error": "SSID must be 1-32 characters"}' >&2
    exit 1
fi

if [ ${#PASSWORD} -lt 8 ] || [ ${#PASSWORD} -gt 64 ]; then
    echo '{"error": "Password must be 8-64 characters"}' >&2
    exit 1
fi

# Find the first available WiFi device
WIFI_DEV=$(nmcli --get-values DEVICE,TYPE device status | grep ':wifi$' | head -1 | cut -d: -f1)

if [ -z "$WIFI_DEV" ]; then
    echo '{"error": "No WiFi device found"}' >&2
    exit 1
fi

# Delete existing connection with same name if it exists
nmcli connection delete "$SSID" 2>/dev/null || true

# Create and connect
nmcli connection add \
    type wifi \
    ifname "$WIFI_DEV" \
    con-name "$SSID" \
    ssid "$SSID" \
    autoconnect yes

nmcli connection modify "$SSID" wifi-sec.key-mgmt wpa-psk
nmcli connection modify "$SSID" wifi-sec.psk "$PASSWORD"
nmcli connection up "$SSID"

echo '{"success": true}'
