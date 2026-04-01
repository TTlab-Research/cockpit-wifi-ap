Name:           cockpit-wifi-ap
Version:        0.1.1
Release:        1%{?dist}
Summary:        Cockpit plugin for WiFi Access Point management
License:        MIT
URL:            https://github.com/TTlab-Research/cockpit-wifi-ap
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
cockpit-wifi-ap provides a modern web interface for managing WiFi
Access Point configuration through Cockpit.

Features:
- Create and manage WiFi Access Points (hotspot)
- Three AP modes: router (NAT+gateway), isolated network, bridge to ethernet
- DHCP server configuration via dnsmasq
- Internet sharing via NAT/masquerading
- Dark theme support via PatternFly 6

%prep
%autosetup

%build
# Nothing to build — pre-built assets are shipped in the tarball

%install
install -d %{buildroot}%{_datadir}/cockpit/wifi-ap
cp -r cockpit/* %{buildroot}%{_datadir}/cockpit/wifi-ap/
install -d %{buildroot}%{_sysconfdir}/cockpit-wifi-ap
install -d %{buildroot}%{_unitdir}
install -m 644 cockpit/systemd/cockpit-wifi-ap.service \
    %{buildroot}%{_unitdir}/cockpit-wifi-ap.service

%post
%systemd_post cockpit-wifi-ap.service

%preun
%systemd_preun cockpit-wifi-ap.service

%postun
%systemd_postun_with_restart cockpit-wifi-ap.service

%files
%license LICENSE
%doc README.md CHANGELOG.md
%{_datadir}/cockpit/wifi-ap/
%dir %{_sysconfdir}/cockpit-wifi-ap
%{_unitdir}/cockpit-wifi-ap.service

%changelog
* Wed Apr 01 2026 TTlab <info@ttlab.it> - 0.1.2-1
- Fix config path: /etc/cockpit-wifi-ap/ap.conf (was /etc/cockpit-wifi)
- Fix error display: parse JSON errors from backend scripts
- CI: Node.js 24, FORCE_JAVASCRIPT_ACTIONS_TO_NODE24

* Wed Apr 01 2026 TTlab <info@ttlab.it> - 0.1.1-1
- Rename to cockpit-wifi-ap, AP management only
- Fix PatternFly CSS, navigation section, channel select

* Mon Mar 23 2026 TTlab <info@ttlab.it> - 0.1.0-1
- Initial release
