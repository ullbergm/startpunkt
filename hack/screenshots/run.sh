#!/usr/bin/env bash
# Takes the screenshots in docs/images from the working tree, with demo
# content on a throwaway kind cluster:
#
#   1. A kind cluster gets the custom resource definitions and the demo
#      content in demo.yaml (the cluster "prod") and staging.yaml ("staging").
#   2. The frontend and the binary are built. Two instances run on this
#      machine: "staging" reads its namespace, "prod" reads the others, has an
#      edit key and follows "staging" as a remote.
#   3. network.mjs answers the availability probes for the example.com
#      addresses, with one service down on each cluster.
#   4. capture.mjs drives Chromium through the shots and the PNGs are made
#      smaller with pngquant when it is installed.
#
# Needs docker, kind, kubectl, go, node with npm, openssl and Chromium
# (CHROMIUM, default /usr/bin/chromium). playwright-core is installed into a
# temporary directory, not into the project. The cluster has a kubeconfig of
# its own, so the current context of your kubectl stays what it is, and it is
# deleted when the script ends.
#
#   VERSION  version shown in the footer (default: the latest tag)
#   KEEP     set to 1 to leave the instances and the cluster running until
#            Enter is pressed, to look at the page on http://127.0.0.1:18080
set -euo pipefail

cd "$(dirname "$0")/../.."
here=hack/screenshots
CLUSTER=startpunkt-screenshots
EDIT_KEY=demo-edit-key-for-screenshots
VERSION=${VERSION:-$(git describe --tags --abbrev=0 2>/dev/null | sed 's/^v//' || echo dev)}
work=$(mktemp -d)
pids=()
export KUBECONFIG=$work/kubeconfig

step() { printf '\n== %s\n' "$*"; }
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

cleanup() {
  for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done
  kind delete cluster --name "$CLUSTER" >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT

# Waits until a command succeeds.
eventually() {
  local what=$1; shift
  for _ in $(seq 1 90); do "$@" >/dev/null 2>&1 && return 0; sleep 2; done
  fail "timed out waiting for: $what"
}

step "cluster"
kind delete cluster --name "$CLUSTER" >/dev/null 2>&1 || true
kind create cluster --name "$CLUSTER" --wait 120s >/dev/null 2>&1
[ "$(kubectl config current-context)" = "kind-$CLUSTER" ] || fail "not the kind cluster"
kubectl apply -f charts/startpunkt/files/crds/ -f charts/startpunkt/crds/ >/dev/null
kubectl wait --for=condition=Established crd --all --timeout=60s >/dev/null
kubectl apply -f $here/demo.yaml -f $here/staging.yaml >/dev/null

step "build ($VERSION)"
(cd web && npm ci --no-audit --no-fund >/dev/null && npm run build >/dev/null)
CGO_ENABLED=0 go build -trimpath -ldflags="-s -w -X main.version=$VERSION" -o "$work/startpunkt" ./cmd/startpunkt
(cd "$work" && npm init -y >/dev/null && npm install --no-audit --no-fund playwright-core >/dev/null)

step "instances"
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj /CN=example.com \
  -keyout "$work/key.pem" -out "$work/cert.pem" 2>/dev/null
node $here/network.mjs 18443 "$work/cert.pem" "$work/key.pem" &
pids+=($!)
common=(HTTPS_PROXY=http://127.0.0.1:18443 NO_PROXY=127.0.0.1,localhost STARTPUNKT_LOG_LEVEL=warn
  STARTPUNKT_WEB_CHECKFORUPDATES=false STARTPUNKT_NAMESPACESELECTOR_ANY=false STARTPUNKT_AVAILABILITY_INTERVAL=10s)
env "${common[@]}" STARTPUNKT_SERVER_ADDRESS=127.0.0.1:18081 STARTPUNKT_CLUSTER_NAME=staging \
  STARTPUNKT_NAMESPACESELECTOR_MATCHNAMES=staging "$work/startpunkt" &
pids+=($!)
env "${common[@]}" STARTPUNKT_SERVER_ADDRESS=127.0.0.1:18080 STARTPUNKT_CLUSTER_NAME=prod \
  STARTPUNKT_NAMESPACESELECTOR_MATCHNAMES=media,monitoring,home,platform,startpunkt \
  STARTPUNKT_EDITING_KEY=$EDIT_KEY STARTPUNKT_EDITING_NAMESPACE=startpunkt \
  STARTPUNKT_FEDERATION_REMOTES='[{"name":"staging","url":"http://127.0.0.1:18081"}]' "$work/startpunkt" &
pids+=($!)
# Every application of both clusters probed: 29 answer, 2 do not.
probed() {
  curl -fsS http://127.0.0.1:18080/api/v1/state | node -e '
    let s = "";
    process.stdin.on("data", (d) => (s += d)).on("end", () => {
      const apps = JSON.parse(s).tiles.filter((t) => t.kind === "application");
      const count = (v) => apps.filter((t) => t.available === v).length;
      process.exit(count(true) === 29 && count(false) === 2 ? 0 : 1);
    });'
}
eventually "both clusters read and probed" probed

if [ "${KEEP:-}" = 1 ]; then
  read -rp "http://127.0.0.1:18080 (edit key $EDIT_KEY). Press Enter to stop. "
  exit 0
fi

step "screenshots"
mkdir -p docs/images/features
cp $here/capture.mjs "$work/"
node "$work/capture.mjs" http://127.0.0.1:18080 "$EDIT_KEY" "$PWD/docs/images"
if command -v pngquant >/dev/null; then
  pngquant --speed 1 --strip --force --ext .png docs/images/screenshot.png docs/images/features/*.png
fi
ls -l docs/images/screenshot.png docs/images/features/*.png
