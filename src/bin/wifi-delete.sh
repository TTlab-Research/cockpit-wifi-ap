#!/bin/bash
# Delete a saved WiFi connection
set -euo pipefail

CONNECTION_ID="${1:?Usage: wifi-delete.sh <CONNECTION_ID>}"

# Ensure connection is not active before deleting
ACTIVE_DEV=$(nmcli -t -f DEVICE connection show --active "$CONNECTION_ID" 2>/dev/null | head -1)
if [ -n "$ACTIVE_DEV" ] && [ "$ACTIVE_DEV" != "--" ]; then
    echo '{"error": "Cannot delete active connection. Disconnect first."}' >&2
    exit 1
fi

nmcli connection delete "$CONNECTION_ID"
echo '{"success": true}'
