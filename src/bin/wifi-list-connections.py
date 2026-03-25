#!/usr/bin/env python3
"""List saved WiFi connections via NetworkManager."""

import json
import subprocess
import sys


def list_connections():
    """List all saved WiFi connection profiles."""
    result = subprocess.run(
        [
            "nmcli", "-t", "-f",
            "NAME,UUID,TYPE,DEVICE",
            "connection", "show",
        ],
        capture_output=True,
        text=True,
        timeout=10,
    )

    if result.returncode != 0:
        print(json.dumps({"error": result.stderr.strip()}), file=sys.stderr)
        sys.exit(1)

    connections = []
    for line in result.stdout.strip().split("\n"):
        if not line:
            continue
        parts = line.split(":")
        if len(parts) < 4:
            continue

        conn_type = parts[2].strip()
        if "wireless" not in conn_type and "wifi" not in conn_type:
            continue

        name = parts[0].strip()
        uuid = parts[1].strip()
        device = parts[3].strip()

        # Get SSID for this connection
        ssid_result = subprocess.run(
            [
                "nmcli", "-t", "-f",
                "802-11-wireless.ssid",
                "connection", "show", uuid,
            ],
            capture_output=True,
            text=True,
            timeout=10,
        )
        ssid = name
        if ssid_result.returncode == 0:
            ssid_line = ssid_result.stdout.strip()
            if ":" in ssid_line:
                ssid = ssid_line.split(":", 1)[1].strip()

        connections.append({
            "id": name,
            "uuid": uuid,
            "ssid": ssid,
            "type": conn_type,
            "device": device,
            "active": device != "" and device != "--",
        })

    print(json.dumps(connections))


if __name__ == "__main__":
    list_connections()
