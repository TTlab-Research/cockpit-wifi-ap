PACKAGE_NAME := cockpit-wifi
VERSION := 0.1.0
PREFIX ?= /usr/local
DESTDIR ?=
INSTALL_DIR = $(DESTDIR)$(PREFIX)/share/cockpit/wifi
CONFIG_DIR = $(DESTDIR)/etc/cockpit-wifi

# Cockpit shared lib checkout (dark-theme, page.scss, etc.)
COCKPIT_REPO_URL = https://github.com/cockpit-project/cockpit.git
COCKPIT_REPO_COMMIT = main

all: build

pkg/lib:
	@echo "Downloading Cockpit shared libraries..."
	git clone --depth 1 --branch $(COCKPIT_REPO_COMMIT) $(COCKPIT_REPO_URL) tmp-cockpit
	mkdir -p pkg/lib
	cp -r tmp-cockpit/pkg/lib/* pkg/lib/
	rm -rf tmp-cockpit

build: node_modules pkg/lib
	NODE_ENV=production ./build.js

node_modules: package.json
	npm ci

watch: node_modules pkg/lib
	npm run watch

install: build
	install -d $(INSTALL_DIR)
	cp -r dist/* $(INSTALL_DIR)/
	install -d $(CONFIG_DIR)

uninstall:
	rm -rf $(INSTALL_DIR)
	rm -rf $(CONFIG_DIR)

devel-install: build
	mkdir -p ~/.local/share/cockpit
	ln -sfn $$(pwd)/dist ~/.local/share/cockpit/wifi

devel-uninstall:
	rm -f ~/.local/share/cockpit/wifi

dist: build
	tar czf $(PACKAGE_NAME)-$(VERSION).tar.gz \
		--transform 's,^dist,$(PACKAGE_NAME)-$(VERSION),' \
		dist/

lint: node_modules
	npm run eslint
	npm run stylelint

clean:
	rm -rf dist node_modules pkg/lib $(PACKAGE_NAME)-*.tar.gz

.PHONY: all build watch install uninstall devel-install devel-uninstall dist lint clean
