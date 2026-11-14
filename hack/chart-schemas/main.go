// chart-schemas extracts JSON schemas from this chart's CRDs for kubeconform.
// It uses the same generated definitions Helm installs.
package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"sigs.k8s.io/yaml"
)

func main() {
	if len(os.Args) != 2 {
		panic("usage: chart-schemas OUTPUT_DIRECTORY")
	}
	for _, directory := range []string{"charts/startpunkt/crds", "charts/startpunkt/files/crds"} {
		files, err := filepath.Glob(filepath.Join(directory, "*.yaml"))
		must(err)
		for _, file := range files {
			raw, err := os.ReadFile(file)
			must(err)
			var crd struct {
				Spec struct {
					Group string `json:"group"`
					Names struct {
						Kind string `json:"kind"`
					} `json:"names"`
					Versions []struct {
						Name   string `json:"name"`
						Schema struct {
							OpenAPI map[string]any `json:"openAPIV3Schema"`
						} `json:"schema"`
					} `json:"versions"`
				} `json:"spec"`
			}
			must(yaml.Unmarshal(raw, &crd))
			for _, version := range crd.Spec.Versions {
				// Like Kubernetes, arbitrary metadata is permitted.
				props := version.Schema.OpenAPI["properties"].(map[string]any)
				props["metadata"] = map[string]any{"type": "object"}
				strict(version.Schema.OpenAPI)
				data, err := json.Marshal(version.Schema.OpenAPI)
				must(err)
				name := strings.ToLower(crd.Spec.Names.Kind) + "-" + crd.Spec.Group + "-" + version.Name + ".json"
				must(os.WriteFile(filepath.Join(os.Args[1], name), data, 0600))
			}
		}
	}
}
func must(err error) {
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

// Preserve free-form settings/maps, but reject unknown fields on structured
// objects just as strict native schemas do.
func strict(schema map[string]any) {
	if schema["x-kubernetes-preserve-unknown-fields"] == true {
		return
	}
	if properties, ok := schema["properties"].(map[string]any); ok {
		if _, set := schema["additionalProperties"]; !set {
			schema["additionalProperties"] = false
		}
		for _, raw := range properties {
			if child, ok := raw.(map[string]any); ok {
				strict(child)
			}
		}
	}
	if child, ok := schema["items"].(map[string]any); ok {
		strict(child)
	}
	if child, ok := schema["additionalProperties"].(map[string]any); ok {
		strict(child)
	}
}
