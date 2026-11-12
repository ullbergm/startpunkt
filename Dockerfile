# syntax=docker/dockerfile:1

# Frontend. The output is platform independent, so it is built once on the
# build platform.
FROM --platform=$BUILDPLATFORM docker.io/library/node:24-alpine AS web
WORKDIR /src/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Binary, cross-compiled on the build platform with the frontend embedded.
FROM --platform=$BUILDPLATFORM docker.io/library/golang:1.27 AS build
ARG TARGETOS
ARG TARGETARCH
ARG VERSION=dev
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY api/ api/
COPY cmd/ cmd/
COPY internal/ internal/
COPY web/embed.go web/embed.go
COPY --from=web /src/web/dist web/dist
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -trimpath -ldflags="-s -w -X main.version=${VERSION}" \
    -o /out/startpunkt ./cmd/startpunkt

FROM gcr.io/distroless/static-debian12:nonroot
ARG VERSION=dev
LABEL org.opencontainers.image.title="Startpunkt" \
      org.opencontainers.image.description="A start page for the resources in a Kubernetes cluster" \
      org.opencontainers.image.source="https://github.com/ullbergm/startpunkt" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.version="${VERSION}"
COPY --from=build /out/startpunkt /startpunkt
EXPOSE 8080
USER 65532:65532
ENTRYPOINT ["/startpunkt"]
