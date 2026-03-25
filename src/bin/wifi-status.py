#!/usr/bin/env python3
"""Get current WiFi connection status."""

import json
import subprocess
import sys


def wifi_status():
    """Get the current WiFi connection details."""
    # Find active WiFi device
    dev_result = subprocess.run(
        [
            "nmcli", "-t", "-f",
            "DEVICE,TYPE,STATE,CONNECTION",
            "device", "status",
        ],
        capture_output=True,
        text=True,
        timeout=10,
    )

    if dev_result.returncode != 0:
        print(json.dumps({"connected": False}))
        return

    wifi_device = None
    wifi_connection = None
    for line in dev_result.stdout.strip().split("\n"):
        parts = line.split(":")
        if len(parts) >= 4 and parts[1].strip() == "wifi":
            if parts[2].strip() == "connected":
                wifi_device = parts[0].strip()
                wifi_connection = parts[3].strip()
                break

    if not wifi_device:
        print(json.dumps({"connected": False}))
        return

    # Get detailed info about the active WiFi connection
    info_result = subprocess.run(
        [
            "nmcli", "-t", "-f",
            "GENERAL.CONNECTION,WIFI.SSID,WIFI.SIGNAL,WIFI.FREQ,WIFI.BITRATE,WIFI.SECURITY,"
            "IP4.ADDRESS",
            "device", "show", wifi_device,
        ],
        capture_output=True,
        text=True,
        timeout=10,
    )

    status = {
        "connected": True,
        "device": wifi_device,
        "state": "connected",
        "ssid": wifi_connection,
        "signal": 0,
        "frequency": 0,
        "bitrate": "",
        "security": "",
        "ipAddress": "",
    }

    if info_result.returncode == 0:
        for line in info_result.stdout.strip().split("\n"):
            if ":" not in line:
                continue
            key, _, value = line.partition(":")
            key = key.strip()
            value = value.strip()

            if key == "WIFI.SSID":
                status["ssid"] = value
            elif key == "WIFI.SIGNAL":
                try:
                    status["signal"] = int(value)
                except ValueError:
                    pass
            elif key == "WIFI.FREQ":
                try:
                    status["frequency"] = int(value.split()[0])
                except (ValueError, IndexError):
                    pass
            elif key == "WIFI.BITRATE":
                status["bitrate"] = value
            elif key == "WIFI.SECURITY":
                status["security"] = value
            elif key == "IP4.ADDRESS":
                status["ipAddress"] = value.split("/")[0] if "/" in value else value

    print(json.dumps(status))


if __name__ == "__main__":
    wifi_status()
