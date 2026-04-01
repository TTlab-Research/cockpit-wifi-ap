Name:           cockpit-wifi
Version:        0.1.1
Release:        1%{?dist}
Summary:        Cockpit plugin for complete WiFi management
License:        MIT
URL:            https://github.com/TTlab-Research/cockpit-wifi
Source0:        %{name}-%{version}.tar.gz

BuildArch:      noarch
# No BuildRequires — package ships pre-built assets from CI

Requires:       cockpit >= 270
Requires:       NetworkManager
Requires:       python3
Requires:       dnsmasq
Requires:       iw
Recommends:     iptables

%description
cockpit-wifi provides a modern web interface for managing WiFi
connections and Access Point configuration through Cockpit.

Features:
- Scan and connect to WiFi networks
- Manage saved WiFi connections
- Create and manage WiFi Access Points (hotspot)
- Three AP modes: router, isolated network, bridge to ethernet
- DHCP server configuration via dnsmasq
- Dark theme support via PatternFly 6

%prep
%autosetup

%build
# Nothing to build — pre-built assets are shipped in the tarball

%install
install -d %{buildroot}%{_datadir}/cockpit/wifi
cp -r cockpit/* %{buildroot}%{_datadir}/cockpit/wifi/
install -d %{buildroot}%{_sysconfdir}/cockpit-wifi

%files
%license LICENSE
%doc README.md CHANGELOG.md
%{_datadir}/cockpit/wifi/
%dir %{_sysconfdir}/cockpit-wifi

%changelog
* Wed Apr 01 2026 TTlab <info@ttlab.it> - 0.1.1-1
- Fix ESLint errors: jsx-quotes, comma-dangle, no-use-before-define
- Fix Stylelint: @use senza estensione .scss
- Fix npm audit: brace-expansion moderate vulnerability

* Mon Mar 23 2026 TTlab <info@ttlab.it> - 0.1.0-1
- Initial release
