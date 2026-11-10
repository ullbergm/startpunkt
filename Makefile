VERSION ?= dev
IMAGE ?= ghcr.io/ullbergm/startpunkt:$(VERSION)

.PHONY: all web build test check image icons crds clean

all: check build

# Frontend build, embedded in the binary by the next target.
web:
	cd web && npm ci && npm run build

build: web
	CGO_ENABLED=0 go build -trimpath -ldflags="-s -w -X main.version=$(VERSION)" \
		-o bin/startpunkt ./cmd/startpunkt

test:
	go test -race ./...
	cd web && npm test

check: test
	go vet ./...
	cd web && npm run check
	helm lint charts/startpunkt
	helm lint charts/startpunkt --set mode=split

image:
	docker build --build-arg VERSION=$(VERSION) -t $(IMAGE) .

# Regenerates the icons in web/public and docs/images/logo.png from the two
# drawings in docs/images. Needs rsvg-convert and ImageMagick. The results are
# committed, so a normal build does not run this.
icons:
	cp docs/images/logo.svg web/public/logo.svg
	rsvg-convert -w 1024 docs/images/logo.svg -o docs/images/logo.png
	rsvg-convert -w 192 docs/images/logo.svg -o web/public/icon-192.png
	rsvg-convert -w 512 docs/images/logo.svg -o web/public/icon-512.png
	rsvg-convert -w 512 docs/images/logo-maskable.svg -o web/public/icon-maskable-512.png
	rsvg-convert -w 180 docs/images/logo-maskable.svg -o web/public/apple-touch-icon.png
	tmp=$$(mktemp -d) && \
		for size in 16 32 48; do rsvg-convert -w $$size docs/images/logo.svg -o $$tmp/$$size.png; done && \
		magick $$tmp/16.png $$tmp/32.png $$tmp/48.png web/public/favicon.ico && \
		rm -r $$tmp

# The definitions of the Startpunkt and Remote resources, generated from the
# Go types in api/v1. Run after changing those types and commit the result.
crds:
	tmp=$$(mktemp -d) && \
		go run sigs.k8s.io/controller-tools/cmd/controller-gen@v0.23.0 crd paths=./api/v1 output:crd:dir=$$tmp && \
		cp $$tmp/startpunkt.ullberg.us_startpunkts.yaml $$tmp/startpunkt.ullberg.us_remotes.yaml charts/startpunkt/crds/ && \
		rm -r $$tmp

clean:
	rm -rf bin
	find web/dist -mindepth 1 ! -name .gitkeep -delete
