#!/usr/bin/env python3
"""List non-wireless network interfaces available for bridging."""

import json
import subprocess


def get_interfaces():
    """List ethernet/wired interfaces that can be used as bridge ports."""
    result = subprocess.run(
        [
            "nmcli", "-t", "-f",
            "DEVICE,TYPE,STATE,CONNECTION",
            "device", "status",
        ],
        capture_output=True,
        text=True,
        timeout=10,
    )

    if result.returncode != 0:
        print(json.dumps([]))
        return

    interfaces = []
    for line in result.stdout.strip().split("\n"):
        if not line:
            continue
        parts = line.split(":")
        if len(parts) < 4:
            continue

        dev_type = parts[1].strip()
        # Include ethernet and similar wired interfaces, exclude wifi/loopback/bridge
        if dev_type not in ("ethernet", "vlan"):
            continue

        interfaces.append({
            "device": parts[0].strip(),
            "type": dev_type,
            "state": parts[2].strip(),
            "connection": parts[3].strip() if parts[3].strip() != "--" else "",
        })

    print(json.dumps(interfaces))


if __name__ == "__main__":
    get_interfaces()
