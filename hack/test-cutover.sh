#!/usr/bin/env bash
# Tests the move from Startpunkt 4.x to v5 on a throwaway kind cluster, the
# way the documentation describes it:
#
#   1. 4.x is installed and owns the Application and Bookmark definitions.
#   2. v5 is installed next to it with crds.install=false and shows the same
#      resources.
#   3. 4.x is removed without losing the definitions or the resources, and
#      the definitions are handed to the v5 release.
#   4. v5 serves v1, writes status, and still reads what was written through
#      the old versions.
#
# It also checks that a release installed on its own leaves the definitions
# behind when it is uninstalled, and that editing works through the chart,
# with the key in a Secret and the roles in separate pods, and that a custom
# source reads a resource type of its own.
#
# Needs docker, kind, kubectl, helm and curl. Nothing outside the kind
# cluster is touched: it has a kubeconfig of its own, so the current context
# of your kubectl stays what it is.
#
#   OLD_REF  git ref the 4.x chart is taken from (default v4.8.0)
#   IMAGE    v5 image to test; built from the working tree when not set
#   KEEP     set to 1 to leave the cluster in place afterwards
set -euo pipefail

cd "$(dirname "$0")/.."
OLD_REF=${OLD_REF:-v4.8.0}
CLUSTER=startpunkt-cutover
PORT=
work=$(mktemp -d)
forward=
export KUBECONFIG=$work/kubeconfig

k() { kubectl "$@"; }
h() { helm "$@"; }
step() { printf '\n== %s\n' "$*"; }
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
ok() { printf 'ok: %s\n' "$*"; }

cleanup() {
  [ -n "$forward" ] && kill "$forward" 2>/dev/null || true
  if [ "${KEEP:-}" = 1 ]; then
    kind get kubeconfig --name "$CLUSTER" >"${TMPDIR:-/tmp}/$CLUSTER.kubeconfig" 2>/dev/null &&
      echo "cluster kept; KUBECONFIG=${TMPDIR:-/tmp}/$CLUSTER.kubeconfig"
  else
    kind delete cluster --name "$CLUSTER" >/dev/null 2>&1 || true
  fi
  rm -rf "$work"
}
trap cleanup EXIT

# Waits until a command succeeds. When it never does, what it last said is
# shown.
eventually() {
  local what=$1 said=; shift
  for _ in $(seq 1 60); do
    if said=$("$@" 2>&1); then ok "$what"; return 0; fi
    sleep 2
  done
  printf '%s\n' "$said" >&2
  fail "timed out waiting for: $what"
}

# Forwards a free local port to a service of the cluster and remembers it
# in PORT.
forward_to() {
  [ -n "$forward" ] && kill "$forward" 2>/dev/null || true
  : >"$work/forward.log"
  # kubectl itself, not the function: the process to stop later is this one.
  kubectl -n "$1" port-forward "svc/$2" :80 >"$work/forward.log" 2>&1 &
  forward=$!
  for _ in $(seq 1 30); do
    PORT=$(sed -n 's/^Forwarding from 127\.0\.0\.1:\([0-9]*\) .*/\1/p' "$work/forward.log" | head -1)
    [ -n "$PORT" ] && return 0
    sleep 1
  done
  cat "$work/forward.log" >&2
  fail "could not forward a port to $2"
}

# The names of the tiles the v5 instance serves, one per line, sorted.
tiles() {
  curl -fsS "http://127.0.0.1:$PORT/api/v1/state" | tr '{' '\n' |
    sed -n 's/.*"kind":"\(application\|bookmark\)","cluster":"[^"]*","name":"\([^"]*\)".*/\1 \2/p' | sort
}
has_tiles() {
  local got
  got=$(tiles) || return 1
  [ "$got" = "$1" ] || { printf 'tiles:\n%s\nexpected:\n%s\n' "$got" "$1"; return 1; }
}

step "cluster"
kind delete cluster --name "$CLUSTER" >/dev/null 2>&1 || true
kind create cluster --name "$CLUSTER" --wait 120s >/dev/null 2>&1
if [ -z "${IMAGE:-}" ]; then
  IMAGE=startpunkt:cutover-test
  docker build -q --build-arg VERSION=cutover-test -t "$IMAGE" . >/dev/null
fi
kind load docker-image "$IMAGE" --name "$CLUSTER" >/dev/null 2>&1
ok "kind cluster with $IMAGE"

step "4.x ($OLD_REF) owns the definitions"
git archive "$OLD_REF" deploy/kubernetes/charts/startpunkt | tar -x -C "$work"
# The 4.x chart always creates a ServiceMonitor. A stand-in for its kind is
# enough for that.
k apply -f - >/dev/null <<EOF
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata: {name: servicemonitors.monitoring.coreos.com}
spec:
  group: monitoring.coreos.com
  names: {kind: ServiceMonitor, plural: servicemonitors}
  scope: Namespaced
  versions:
    - name: v1
      served: true
      storage: true
      schema: {openAPIV3Schema: {type: object, x-kubernetes-preserve-unknown-fields: true}}
EOF
k wait --for=condition=Established crd/servicemonitors.monitoring.coreos.com --timeout=60s >/dev/null
# Only its definitions matter here, so its pods are not started.
h install startpunkt "$work/deploy/kubernetes/charts/startpunkt" -n startpunkt --create-namespace \
  --set startpunkt.deployment.replicas=0 --set startpunkt.serviceAccountName=startpunkt >/dev/null
k wait --for=condition=Established crd/applications.startpunkt.ullberg.us crd/bookmarks.startpunkt.ullberg.us --timeout=60s >/dev/null
[ "$(k get crd applications.startpunkt.ullberg.us -o jsonpath='{.spec.versions[?(@.storage==true)].name}')" = v1alpha4 ] ||
  fail "expected 4.x to store v1alpha4"
k create namespace tiles >/dev/null
# One resource through each version that 4.x serves.
for v in v1alpha1 v1alpha2 v1alpha3 v1alpha4; do
  k apply -f - >/dev/null 2>&1 <<EOF
apiVersion: startpunkt.ullberg.us/$v
kind: Application
metadata: {name: app-$v, namespace: tiles}
spec: {name: App $v, group: Old, url: "http://app-$v.example.invalid"}
EOF
done
k apply -f - >/dev/null <<EOF
apiVersion: startpunkt.ullberg.us/v1alpha4
kind: Bookmark
metadata: {name: docs, namespace: tiles}
spec: {name: Docs, group: Links, url: "https://example.com/docs"}
EOF
ok "four applications and a bookmark, written through v1alpha1 to v1alpha4"

step "v5 next to it, without definitions of its own"
values=(--set image.repository="${IMAGE%:*}" --set image.tag="${IMAGE##*:}" --set image.pullPolicy=Never
  --set availability.interval=5s)
h install startpunkt-v5 charts/startpunkt -n startpunkt-v5 --create-namespace \
  --set crds.install=false "${values[@]}" --wait --timeout 180s >/dev/null
[ "$(k get crd applications.startpunkt.ullberg.us -o jsonpath='{.metadata.annotations.meta\.helm\.sh/release-name}')" = startpunkt ] ||
  fail "the v5 release must not take the definitions"
forward_to startpunkt-v5 startpunkt-v5
expected=$'application App v1alpha1\napplication App v1alpha2\napplication App v1alpha3\napplication App v1alpha4\nbookmark Docs'
eventually "v5 shows the resources of 4.x" has_tiles "$expected"
k get crd startpunkts.startpunkt.ullberg.us remotes.startpunkt.ullberg.us >/dev/null || fail "the settings definitions are missing"
eventually "the settings resource is in use" \
  k -n startpunkt-v5 wait --for=condition=Configured startpunkt/startpunkt-v5 --timeout=1s

step "cutover"
# "helm uninstall" would delete the definitions, and with them every
# Application and Bookmark: they are part of the 4.x release, and a keep
# annotation put on them now is not honoured, because Helm goes by the
# manifest it stored. So 4.x is taken away by hand. Everything it created
# except the definitions carries this label.
h get manifest startpunkt -n startpunkt | k delete -f - -l app.kubernetes.io/name=startpunkt >/dev/null
# Helm's record of the release. Deleting it deletes nothing else.
k -n startpunkt delete secret -l owner=helm,name=startpunkt >/dev/null
[ -z "$(h list -n startpunkt -q)" ] || fail "Helm still knows the 4.x release"
[ -z "$(k -n startpunkt get deployment,service,serviceaccount -l app.kubernetes.io/name=startpunkt -o name)" ] &&
  ! k get clusterrole startpunkt-role >/dev/null 2>&1 || fail "parts of 4.x are still there"
k get crd applications.startpunkt.ullberg.us bookmarks.startpunkt.ullberg.us >/dev/null ||
  fail "removing 4.x removed the definitions"
[ "$(k -n tiles get applications -o name | wc -l)" = 4 ] && [ "$(k -n tiles get bookmarks -o name | wc -l)" = 1 ] ||
  fail "removing 4.x lost resources"
ok "4.x is gone; the definitions and the resources are still there"
for crd in applications bookmarks; do
  k annotate crd "$crd.startpunkt.ullberg.us" --overwrite \
    meta.helm.sh/release-name=startpunkt-v5 meta.helm.sh/release-namespace=startpunkt-v5 >/dev/null
  k label crd "$crd.startpunkt.ullberg.us" --overwrite app.kubernetes.io/managed-by=Helm >/dev/null
done
h upgrade startpunkt-v5 charts/startpunkt -n startpunkt-v5 --set crds.install=true "${values[@]}" \
  --wait --timeout 180s >/dev/null
ok "the v5 release owns the definitions"

step "after the cutover"
for crd in applications bookmarks; do
  [ "$(k get crd "$crd.startpunkt.ullberg.us" -o jsonpath='{.spec.versions[?(@.storage==true)].name}')" = v1 ] ||
    fail "$crd: v1 is not the stored version"
  [ "$(k get crd "$crd.startpunkt.ullberg.us" -o jsonpath='{range .spec.versions[?(@.served==true)]}{.name} {end}')" = "v1 v1alpha4 v1alpha3 v1alpha2 v1alpha1 " ] ||
    fail "$crd: not every version is served"
done
ok "v1 is stored and v1alpha1 to v1alpha4 are still served"
[ "$(k -n tiles get applications.v1.startpunkt.ullberg.us -o name | wc -l)" = 4 ] || fail "the old resources do not read as v1"
[ "$(k -n tiles get applications.v1alpha1.startpunkt.ullberg.us app-v1alpha4 -o jsonpath='{.spec.name}' 2>/dev/null)" = "App v1alpha4" ] ||
  fail "a resource does not read through an older version"
ok "every resource reads through v1 and through the old versions"
eventually "v5 still shows the same tiles" has_tiles "$expected"

# The status could not be written before: the 4.x definitions do not
# declare its fields.
status() { k -n tiles get application "$1" -o jsonpath="$2"; }
resolved() { [ "$(status app-v1alpha2 '{.status.conditions[?(@.type=="Resolved")].status}')" = True ]; }
eventually "the controller writes status now" resolved
[ "$(status app-v1alpha2 '{.status.url}')" = "http://app-v1alpha2.example.invalid" ] || fail "status.url is wrong"
probed() { [ "$(status app-v1alpha2 '{.status.available}')" = false ]; }
eventually "the status says that the URL does not answer" probed

# New resources: one written the new way, one from a manifest that was not
# updated. The second is accepted with a warning.
k apply -f - >/dev/null <<EOF
apiVersion: startpunkt.ullberg.us/v1
kind: Application
metadata: {name: app-v1, namespace: tiles}
spec: {name: App v1, group: New, url: "http://app-v1.example.invalid"}
EOF
warning=$(k apply -f - 2>&1 <<EOF
apiVersion: startpunkt.ullberg.us/v1alpha4
kind: Bookmark
metadata: {name: more, namespace: tiles}
spec: {name: More, group: Links, url: "https://example.com/more"}
EOF
)
case "$warning" in *"is deprecated; use startpunkt.ullberg.us/v1"*) ok "an old manifest is accepted with a deprecation warning" ;;
  *) fail "no deprecation warning: $warning" ;; esac
expected=$'application App v1\napplication App v1alpha1\napplication App v1alpha2\napplication App v1alpha3\napplication App v1alpha4\nbookmark Docs\nbookmark More'
eventually "both new resources are shown" has_tiles "$expected"
if k apply -f - >/dev/null 2>&1 <<EOF
apiVersion: startpunkt.ullberg.us/v1
kind: Bookmark
metadata: {name: broken, namespace: tiles}
spec: {name: No URL}
EOF
then fail "a bookmark without a URL was accepted"; fi
ok "what 4.x required is still required"

step "uninstalling v5 keeps the definitions"
h uninstall startpunkt-v5 -n startpunkt-v5 >/dev/null
k get crd applications.startpunkt.ullberg.us bookmarks.startpunkt.ullberg.us >/dev/null ||
  fail "uninstalling v5 removed the definitions"
[ "$(k -n tiles get applications -o name | wc -l)" = 5 ] || fail "uninstalling v5 lost resources"
ok "the definitions and the resources survive"

step "a first installation, with the defaults"
k delete crd applications.startpunkt.ullberg.us bookmarks.startpunkt.ullberg.us \
  startpunkts.startpunkt.ullberg.us remotes.startpunkt.ullberg.us >/dev/null
h install start charts/startpunkt -n fresh --create-namespace "${values[@]}" --wait --timeout 180s >/dev/null
k -n fresh apply -f - >/dev/null <<EOF
apiVersion: startpunkt.ullberg.us/v1
kind: Application
metadata: {name: first}
spec: {name: First, url: "http://first.example.invalid"}
EOF
forward_to fresh start-startpunkt
eventually "a new release serves its first application" has_tiles "application First"

step "editing from the page, with the roles in separate pods"
EDIT_KEY=a-key-for-the-test-cluster
h install edit charts/startpunkt -n editing --create-namespace "${values[@]}" \
  --set mode=split --set crds.install=false \
  --set editing.enabled=true --set editing.key="$EDIT_KEY" --wait --timeout 180s >/dev/null
forward_to editing edit-startpunkt-api
api() { # method path [body] -> prints the status
  curl -sS -o "$work/answer" -w '%{http_code}' -X "$1" "http://127.0.0.1:$PORT/api/v1/$2" \
    -H "Authorization: Bearer ${KEY-$EDIT_KEY}" ${3:+-H 'Content-Type: application/json' -d "$3"}
}
[ "$(KEY=not-the-key api GET unlock)" = 401 ] || fail "a wrong key was not refused"
[ "$(KEY=not-the-key api POST applications '{"spec":{"name":"Intruder","url":"https://x.example.invalid"}}')" = 401 ] ||
  fail "a write with a wrong key was not refused"
[ "$(api GET unlock)" = 204 ] || fail "the key was not accepted: $(cat "$work/answer")"
ok "the key is checked"
[ "$(api POST applications '{"spec":{"name":"From the page","group":"Edited","url":"https://page.example.invalid"}}')" = 201 ] ||
  fail "create: $(cat "$work/answer")"
[ "$(k -n editing get applications.startpunkt.ullberg.us from-the-page -o jsonpath='{.spec.name}')" = "From the page" ] ||
  fail "the application is not in the cluster"
eventually "an application created through the api pod is shown" has_tiles $'application First\napplication From the page'
[ "$(api PUT applications/editing/from-the-page '{"spec":{"name":"Renamed","url":"https://page.example.invalid"}}')" = 400 ] ||
  fail "an update without resourceVersion was not refused"
update_from_page() {
  [ "$(api GET applications/editing/from-the-page)" = 200 ] || return 1
  opened_version=$(sed -n 's/.*"resourceVersion":"\([^"]*\)".*/\1/p' "$work/answer")
  [ -n "$opened_version" ] || return 1
  printf '%s' "$opened_version" >"$work/opened-version"
  [ "$(api PUT applications/editing/from-the-page "{\"resourceVersion\":\"$opened_version\",\"spec\":{\"name\":\"Renamed\",\"url\":\"https://page.example.invalid\"}}")" = 200 ]
}
eventually "an update carries the version through the api pod" update_from_page
opened_version=$(cat "$work/opened-version")
[ "$(api PUT applications/editing/from-the-page "{\"resourceVersion\":\"$opened_version\",\"spec\":{\"name\":\"Stale\",\"url\":\"https://stale.example.invalid\"}}")" = 409 ] ||
  fail "a stale editor overwrote a newer save"
eventually "a change is shown" has_tiles $'application First\napplication Renamed'
# A status-only change must not invalidate an editor's spec token.
[ "$(api GET applications/editing/from-the-page)" = 200 ] || fail "read for spec token"
opened_token=$(sed -n 's/.*"specToken":"\([^"]*\)".*/\1/p' "$work/answer")
opened_version=$(sed -n 's/.*"resourceVersion":"\([^"]*\)".*/\1/p' "$work/answer")
[ -n "$opened_token" ] || fail "the editor read has no spec token"
k -n editing patch applications.startpunkt.ullberg.us from-the-page --subresource=status --type=merge -p '{"status":{"available":true}}' >/dev/null
[ "$(api PUT applications/editing/from-the-page "{\"resourceVersion\":\"$opened_version\",\"specToken\":\"$opened_token\",\"spec\":{\"name\":\"Renamed\",\"url\":\"https://page.example.invalid\"}}")" = 200 ] || fail "status-only change rejected: $(cat "$work/answer")"
ok "status-only writes do not reject an open editor"
[ "$(api POST bookmarks '{"spec":{"name":"Bad","group":"g","url":"javascript:alert(1)"}}')" = 400 ] ||
  fail "a link that is not http or https was accepted"
[ "$(api DELETE applications/editing/from-the-page)" = 204 ] || fail "delete: $(cat "$work/answer")"
eventually "a deletion is shown" has_tiles "application First"
! k -n editing get applications.startpunkt.ullberg.us from-the-page >/dev/null 2>&1 || fail "the application was not deleted"
# The release without editing has none of this.
forward_to fresh start-startpunkt
[ "$(api GET unlock)" = 404 ] || fail "a release without an edit key answers on the edit endpoints"
ok "a release without an edit key has no edit endpoints"

step "a custom source for a resource type of its own"
k apply -f - >/dev/null <<EOF
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata: {name: widgets.example.test}
spec:
  group: example.test
  names: {kind: Widget, plural: widgets}
  scope: Namespaced
  versions:
    - name: v1
      served: true
      storage: true
      schema: {openAPIV3Schema: {type: object, x-kubernetes-preserve-unknown-fields: true}}
EOF
k wait --for=condition=Established crd/widgets.example.test --timeout=60s >/dev/null
k apply -f - >/dev/null <<EOF
apiVersion: example.test/v1
kind: Widget
metadata: {name: gadget, namespace: editing}
spec: {host: gadget.example.invalid}
---
apiVersion: example.test/v1
kind: Widget
metadata: {name: hostless, namespace: editing}
spec: {}
EOF
custom='[{"name":"widgets","apiGroup":"example.test","version":"v1","resource":"widgets","onlyAnnotated":false,"defaultProtocol":"https","url":"object.spec.host","tileName":"\"Widget \" + object.metadata.name"}]'
h upgrade edit charts/startpunkt -n editing --reuse-values --set-json "sources.custom=$custom" --wait --timeout 180s >/dev/null
forward_to editing edit-startpunkt-api
# The object without a host fails the expression and is skipped; the other
# one is shown, without a restart and with the permissions the chart gave.
eventually "an object of the custom type is shown" has_tiles $'application First\napplication Widget gadget'
k -n editing logs deploy/edit-startpunkt-controller | grep -q '"skipping object".*"hostless"' ||
  fail "the object the expression fails on was not reported"
ok "an object the expression fails on is skipped and reported"
# An expression that does not compile is refused, and says so.
broken=${custom/object.spec.host/object.spec.(}
h upgrade edit charts/startpunkt -n editing --reuse-values --set-json "sources.custom=$broken" --timeout 180s >/dev/null
refused() {
  k -n editing get startpunkt edit-startpunkt -o jsonpath='{.status.conditions[?(@.type=="Configured")].status} {.status.conditions[?(@.type=="Configured")].message}' |
    grep -q '^False .*does not compile'
}
eventually "a mapping that does not compile is refused in the status" refused
has_tiles $'application First\napplication Widget gadget' || fail "the last valid settings are no longer in use"
ok "the instance carries on with the last valid settings"

printf '\nAll checks passed.\n'
