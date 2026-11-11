package main

import (
	"os"
	"path/filepath"
	"reflect"
	"testing"

	"sigs.k8s.io/yaml"

	apiv1 "github.com/ullbergm/startpunkt/api/v1"
)

const generated = `
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: applications.startpunkt.ullberg.us
spec:
  group: startpunkt.ullberg.us
  names:
    kind: Application
    plural: applications
  scope: Namespaced
  versions:
  - name: v1
    served: true
    storage: true
    subresources:
      status: {}
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              name:
                type: string
status:
  storedVersions: []
`

func TestEveryOlderVersionIsServedWithTheSameSchema(t *testing.T) {
	out, err := addVersions([]byte(generated))
	if err != nil {
		t.Fatal(err)
	}
	var crd struct {
		Spec struct {
			Conversion struct{ Strategy string }
			Versions   []map[string]any
		}
		Status map[string]any
	}
	if err := yaml.Unmarshal(out, &crd); err != nil {
		t.Fatal(err)
	}
	if crd.Status != nil || crd.Spec.Conversion.Strategy != "None" {
		t.Errorf("status %v, conversion %q", crd.Status, crd.Spec.Conversion.Strategy)
	}
	var names []string
	stored := 0
	for _, v := range crd.Spec.Versions {
		name := v["name"].(string)
		names = append(names, name)
		if v["served"] != true {
			t.Errorf("%s is not served", name)
		}
		if v["storage"] == true {
			stored++
			if name != "v1" || v["deprecated"] != nil {
				t.Errorf("%s must not be the stored version, or v1 must not be deprecated", name)
			}
		} else if v["deprecated"] != true || v["deprecationWarning"] !=
			"startpunkt.ullberg.us/"+name+" Application is deprecated; use startpunkt.ullberg.us/v1" {
			t.Errorf("%s: deprecated %v, warning %v", name, v["deprecated"], v["deprecationWarning"])
		}
		if !reflect.DeepEqual(v["schema"], crd.Spec.Versions[0]["schema"]) ||
			!reflect.DeepEqual(v["subresources"], crd.Spec.Versions[0]["subresources"]) {
			t.Errorf("%s differs from v1 in more than its name", name)
		}
	}
	if want := []string{"v1", "v1alpha4", "v1alpha3", "v1alpha2", "v1alpha1"}; !reflect.DeepEqual(names, want) || stored != 1 {
		t.Errorf("versions %v, stored %d", names, stored)
	}
}

func TestAnUnexpectedDefinitionIsRefused(t *testing.T) {
	if _, err := addVersions([]byte("spec:\n  versions:\n  - name: v2\n")); err == nil {
		t.Error("a definition that is not at v1 must be refused")
	}
	if _, err := addVersions([]byte("spec:\n  versions: []\n")); err == nil {
		t.Error("a definition without a version must be refused")
	}
}

// The definitions in the chart are the ones that reach clusters. They must
// serve every version this program is meant to add, and what the 4.x
// definitions required must still be required: an object that was valid
// stays valid, and nothing new is asked of it.
func TestTheChartsDefinitions(t *testing.T) {
	required := map[string]map[string][]string{
		"applications.yaml": {"spec": {"name"}, "spec.urlFrom": {"apiVersion", "kind", "name", "property"}},
		"bookmarks.yaml":    {"spec": {"group", "name", "url"}},
	}
	for file, want := range required {
		data, err := os.ReadFile(filepath.Join("..", "..", "charts", "startpunkt", "files", "crds", file))
		if err != nil {
			t.Fatal(err)
		}
		var crd map[string]any
		if err := yaml.Unmarshal(data, &crd); err != nil {
			t.Fatal(err)
		}
		versions := crd["spec"].(map[string]any)["versions"].([]any)
		if len(versions) != 1+len(apiv1.DeprecatedVersions) {
			t.Errorf("%s: %d versions; run make crds", file, len(versions))
		}
		for _, v := range versions {
			version := v.(map[string]any)
			root := version["schema"].(map[string]any)["openAPIV3Schema"].(map[string]any)
			if root["required"] != nil {
				t.Errorf("%s %v: nothing was required at the top in 4.x, found %v", file, version["name"], root["required"])
			}
			spec := root["properties"].(map[string]any)["spec"].(map[string]any)
			at := map[string]map[string]any{"spec": spec}
			if urlFrom, ok := spec["properties"].(map[string]any)["urlFrom"].(map[string]any); ok {
				at["spec.urlFrom"] = urlFrom
			}
			for path, fields := range want {
				var got []string
				for _, f := range at[path]["required"].([]any) {
					got = append(got, f.(string))
				}
				if !reflect.DeepEqual(got, fields) {
					t.Errorf("%s %v: %s requires %v, want %v", file, version["name"], path, got, fields)
				}
			}
		}
	}
}
