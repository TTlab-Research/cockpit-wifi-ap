#!/usr/bin/env python3
"""Scan for available WiFi networks using nmcli."""

import json
import subprocess
import sys


def scan_wifi():
    """Run nmcli to scan and list available WiFi networks."""
    try:
        subprocess.run(
            ["nmcli", "dev", "wifi", "rescan"],
            capture_output=True,
            timeout=15,
        )
    except (subprocess.TimeoutExpired, subprocess.SubprocessError):
        pass  # Rescan may fail if already scanning, continue to list

    # Use \: to escape colons in field values (BSSID contains colons)
    result = subprocess.run(
        [
            "nmcli", "-t", "-e", "yes", "-f",
            "IN-USE,SSID,SIGNAL,SECURITY,FREQ,BSSID",
            "dev", "wifi", "list",
        ],
        capture_output=True,
        text=True,
        timeout=30,
    )

    if result.returncode != 0:
        print(json.dumps({"error": result.stderr.strip()}), file=sys.stderr)
        sys.exit(1)

    networks = []
    seen: set[str] = set()

    for line in result.stdout.strip().split("\n"):
        if not line:
            continue

        # nmcli -e yes escapes colons as \: in field values
        # Split on unescaped colons only
        parts = _split_nmcli_escaped(line)
        if len(parts) < 6:
            continue

        in_use = parts[0].strip() == "*"
        ssid = parts[1].strip().replace("\\:", ":")
        if not ssid or ssid in seen:
            continue
        seen.add(ssid)

        try:
            signal = int(parts[2].strip())
        except ValueError:
            signal = 0

        security = parts[3].strip().replace("\\:", ":")

        try:
            freq_str = parts[4].strip().replace("\\:", ":").split()[0]
            frequency = int(freq_str)
        except (ValueError, IndexError):
            frequency = 0

        # BSSID: rejoin remaining parts and unescape
        bssid = ":".join(parts[5:]).strip().replace("\\:", ":")

        networks.append({
            "ssid": ssid,
            "signal": signal,
            "security": security,
            "frequency": frequency,
            "bssid": bssid,
            "inUse": in_use,
        })

    networks.sort(key=lambda n: n["signal"], reverse=True)
    print(json.dumps(networks))


def _split_nmcli_escaped(line: str) -> list[str]:
    """Split nmcli -e yes output on unescaped colons."""
    parts: list[str] = []
    current: list[str] = []
    i = 0
    while i < len(line):
        if line[i] == "\\" and i + 1 < len(line) and line[i + 1] == ":":
            current.append("\\:")
            i += 2
        elif line[i] == ":":
            parts.append("".join(current))
            current = []
            i += 1
        else:
            current.append(line[i])
            i += 1
    parts.append("".join(current))
    return parts


if __name__ == "__main__":
    scan_wifi()
