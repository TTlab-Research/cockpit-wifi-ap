#!/usr/bin/env python3
"""Get Access Point runtime status."""

import json
import os
import subprocess


def ap_status():
    """Check if the cockpit-wifi-ap connection is active and gather stats."""
    # Check if our AP connection is active
    result = subprocess.run(
        [
            "nmcli", "-t", "-f",
            "NAME,DEVICE,TYPE",
            "connection", "show", "--active",
        ],
        capture_output=True,
        text=True,
        timeout=10,
    )

    status = {
        "active": False,
        "ssid": "",
        "interface": "",
        "connectedClients": 0,
        "address": "",
        "dhcpActive": False,
        "mode": "router",
    }

    if result.returncode != 0:
        print(json.dumps(status))
        return

    ap_device = ""
    for line in result.stdout.strip().split("\n"):
        parts = line.split(":")
        if len(parts) >= 3 and parts[0].strip() == "cockpit-wifi-ap":
            ap_device = parts[1].strip()
            break

    if not ap_device:
        print(json.dumps(status))
        return

    status["active"] = True
    status["interface"] = ap_device

    # Read mode from config file
    config_file = "/etc/cockpit-wifi/ap.conf"
    if os.path.exists(config_file):
        try:
            with open(config_file) as f:
                config = json.load(f)
            status["mode"] = config.get("mode", "router")
        except (json.JSONDecodeError, OSError):
            pass

    # Get SSID and IP
    detail_result = subprocess.run(
        [
            "nmcli", "-t", "-f",
            "802-11-wireless.ssid,IP4.ADDRESS",
            "connection", "show", "cockpit-wifi-ap",
        ],
        capture_output=True,
        text=True,
        timeout=10,
    )

    if detail_result.returncode == 0:
        for line in detail_result.stdout.strip().split("\n"):
            if ":" not in line:
                continue
            key, _, value = line.partition(":")
            key = key.strip()
            value = value.strip()
            if "ssid" in key.lower():
                status["ssid"] = value
            elif "address" in key.lower():
                status["address"] = value.split("/")[0] if "/" in value else value

    # Count connected clients via iw
    iw_result = subprocess.run(
        ["iw", "dev", ap_device, "station", "dump"],
        capture_output=True,
        text=True,
        timeout=10,
    )
    if iw_result.returncode == 0:
        status["connectedClients"] = iw_result.stdout.count("Station ")

    # Check if dnsmasq config exists (not used in bridge mode)
    status["dhcpActive"] = os.path.exists("/etc/dnsmasq.d/cockpit-wifi-ap.conf")

    print(json.dumps(status))


if __name__ == "__main__":
    ap_status()
