# Changelog

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2-alpha.11] - 2026-04-01

### Added
- Add country code selector and auto channel option

## [0.1.2-alpha.10] - 2026-04-01

### Fixed
- Use system dnsmasq.service instead of dedicated process

## [0.1.2-alpha.9] - 2026-04-01

### Fixed
- Resolve ap hotspot creation timeout and 802.1x error

## [0.1.2-alpha.8] - 2026-04-01

### Fixed
- Repair rpm/deb build failures and open firewall for ap clients

## [0.1.2-alpha.7] - 2026-04-01

### Fixed
- Repair dhcp, nftables auto-management and package builds

## [0.1.2-alpha.6] - 2026-04-01

### Fixed
- Add device hostname resolution in dnsmasq for wireless clients

## [0.1.2-alpha.5] - 2026-04-01

### Added
- Add systemd service for ap autostart on boot

## [0.1.2-alpha.4] - 2026-04-01

### Added
- Add i18n support with english default and italian translation

### Fixed
- Use menu instead of tools to place access point below rete in cockpit nav

## [0.1.2-alpha.3] - 2026-04-01

### Fixed
- Bring up ap interface before starting dnsmasq, use bind-dynamic

## [0.1.2-alpha.2] - 2026-04-01

### Fixed
- Pass wifi.band to nmcli only when not auto, fixes channel property error

## [0.1.2-alpha.1] - 2026-04-01

### Fixed
- Update config path to /etc/cockpit-wifi-ap, parse json errors in ui

### Maintenance
- Bump version to 0.1.2

## [0.1.1-alpha.1] - 2026-04-01

### Added
- Initial cockpit-wifi plugin
- Rename to cockpit-wifi-ap, ap-only scope

### Fixed
- Resolve all ESLint errors (jsx-quotes, comma-dangle, no-use-before-define)
- Resolve stylelint @use extension error, bump to 0.1.1
- Correct artifact paths in release workflow (.deb and .rpm)
- Remove lefthook from ci (not needed, linters run explicitly)
- Add nodejs/npm to deb build deps, handle pre-release version in rpm spec
- Remove debian/compat duplicate, fix rpm tarball dir for pre-release versions
- Ship pre-built assets in rpm tarball, skip build phase in spec

### Maintenance
- Switch license to MIT, add TTlab author metadata
- Fix brace-expansion moderate vulnerability (npm audit fix)
- Add lefthook pre-commit hooks and commitlint validation


