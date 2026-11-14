#!/usr/bin/env bash
# Validate native Kubernetes resources and Startpunkt CRs. Operator-owned
# Route/ServiceMonitor/GrafanaDashboard schemas are outside this check.
# The registry omits the recursive CRD schema; make crds and test-cutover
# check definitions separately. Unknown resource schemas otherwise fail.
set -euo pipefail
cd "$(dirname "$0")/.."
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
go run ./hack/chart-schemas "$work"
GOBIN="$work" go install github.com/yannh/kubeconform/cmd/kubeconform@v0.7.0
for mode in single split; do
  for resources in true false; do
    helm template schemas charts/startpunkt --namespace startpunkt --include-crds \
      --set "mode=$mode" --set "customResources.enabled=$resources" \
      --set networkPolicy.enabled=true --set editing.enabled=true \
      --set editing.existingSecret=schema-test-key --set leaderElection.enabled=true \
      --set ingress.enabled=true --set ingress.host=startpunkt.example.com > "$work/rendered.yaml"
    "$work/kubeconform" -strict -summary -skip CustomResourceDefinition \
      -kubernetes-version 1.35.0 -schema-location default \
      -schema-location "$work/{{.ResourceKind}}-{{.Group}}-{{.ResourceAPIVersion}}.json" \
      "$work/rendered.yaml"
  done
done
