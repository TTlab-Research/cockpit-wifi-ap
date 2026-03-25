# cockpit-wifi

A modern [Cockpit](https://cockpit-project.org/) plugin for complete WiFi management: client connections and Access Point setup.

Built with React, PatternFly 6, and TypeScript. Supports dark theme natively.

## Features

- **Dashboard** — Real-time overview of WiFi client status, AP status, and wireless devices
- **WiFi Client** — Scan, connect, disconnect, and manage saved WiFi networks
- **Access Point** — Configure and run a WiFi hotspot with DHCP (dnsmasq) and internet sharing (NAT)
- **Dark theme** — Automatic via Cockpit/PatternFly integration

## Requirements

- Cockpit >= 270
- NetworkManager
- Python 3
- dnsmasq (for AP mode)
- iw (for device capability detection)
- iptables (recommended, for internet sharing)

## Quick Start

```bash
# Install tools via mise
mise install

# Setup dependencies
mise run setup

# Development (watch mode + symlink)
mise run dev
mise run install:dev

# Production install
mise run build
mise run install
```

## Development

```bash
# Watch mode with hot reload
mise run dev

# Install dev symlink (no sudo needed)
mise run install:dev

# Open Cockpit at https://localhost:9090
# Plugin appears under "WiFi" in the sidebar
```

## Build & Package

```bash
# Build Debian package
mise run deb

# Build RPM package (Fedora/RHEL)
# See packaging/rpm/cockpit-wifi.spec
```

## Project Structure

```
cockpit-wifi/
├── src/
│   ├── components/          # React components (Dashboard, WifiClient, AccessPoint)
│   ├── lib/                 # TypeScript types, API layer, Cockpit type defs
│   ├── bin/                 # Backend scripts (Python + Bash → nmcli)
│   ├── app.tsx              # Main app with tabbed navigation
│   ├── index.tsx            # Entry point + dark theme setup
│   └── manifest.json        # Cockpit plugin manifest
├── debian/                  # Debian packaging
├── packaging/rpm/           # RPM spec
├── build.js                 # esbuild configuration
├── .mise.toml               # mise tasks and tool versions
└── Taskfile.yml             # go-task alternative
```

## License

GPL-3.0-or-later — Copyright (C) 2026 TTlab
