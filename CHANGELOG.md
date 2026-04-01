# Changelog

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1-beta.1] - 2026-04-01

### Added
- Initial cockpit-wifi plugin

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


