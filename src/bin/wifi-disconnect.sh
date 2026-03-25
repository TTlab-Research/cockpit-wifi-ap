#!/bin/bash
# Disconnect a WiFi connection
set -euo pipefail

CONNECTION_ID="${1:?Usage: wifi-disconnect.sh <CONNECTION_ID>}"

nmcli connection down "$CONNECTION_ID"
echo '{"success": true}'
