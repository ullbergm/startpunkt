VERSION ?= dev
IMAGE ?= ghcr.io/ullbergm/startpunkt:$(VERSION)

.PHONY: all web build test check image clean

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

clean:
	rm -rf bin
	find web/dist -mindepth 1 ! -name .gitkeep -delete
