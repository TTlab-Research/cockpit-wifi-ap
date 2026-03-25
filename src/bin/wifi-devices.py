#!/usr/bin/env python3
"""Discover wireless devices and their capabilities."""

import json
import subprocess
import sys


def get_wifi_devices():
    """List all wireless devices with AP capability info."""
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

    devices = []
    for line in result.stdout.strip().split("\n"):
        parts = line.split(":")
        if len(parts) < 4:
            continue
        if parts[1].strip() != "wifi":
            continue

        dev_name = parts[0].strip()

        # Get device details including capabilities
        detail_result = subprocess.run(
            [
                "nmcli", "-t", "-f",
                "GENERAL.HWADDR,WIFI.CAPABILITIES",
                "device", "show", dev_name,
            ],
            capture_output=True,
            text=True,
            timeout=10,
        )

        hw_address = ""
        capabilities = []
        support_ap = False

        if detail_result.returncode == 0:
            for detail_line in detail_result.stdout.strip().split("\n"):
                if ":" not in detail_line:
                    continue
                key, _, value = detail_line.partition(":")
                key = key.strip()
                value = value.strip()

                if key == "GENERAL.HWADDR":
                    hw_address = value
                elif "CAPABILITIES" in key.upper():
                    capabilities = [c.strip() for c in value.split(",") if c.strip()]

        # Check AP support via iw
        iw_result = subprocess.run(
            ["iw", "phy"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if iw_result.returncode == 0:
            support_ap = "* AP" in iw_result.stdout

        devices.append({
            "device": dev_name,
            "type": "wifi",
            "state": parts[2].strip(),
            "connection": parts[3].strip() if parts[3].strip() != "--" else "",
            "hwAddress": hw_address,
            "capabilities": capabilities,
            "supportAP": support_ap,
        })

    print(json.dumps(devices))


if __name__ == "__main__":
    get_wifi_devices()
