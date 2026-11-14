package chart_test

import (
	"strings"
	"testing"

	"sigs.k8s.io/yaml"
)

func TestNetworkPolicyPeers(t *testing.T) {
	out, err := render(t)
	if err != nil {
		t.Fatalf("render: %v %s", err, out)
	}
	if strings.Contains(string(out), "kind: NetworkPolicy") {
		t.Fatal("policy enabled by default")
	}
	for _, mode := range []string{"single", "split"} {
		out, err = render(t, "--set", "mode="+mode, "--set", "networkPolicy.enabled=true", "--set", "leaderElection.enabled=true")
		if err != nil {
			t.Fatalf("render: %v %s", err, out)
		}
		policies := 0
		for _, doc := range strings.Split(string(out), "\n---") {
			var v struct {
				Kind string
				Spec struct {
					PodSelector struct{ MatchLabels map[string]string }
					PolicyTypes []string
					Ingress     []struct {
						From []struct {
							PodSelector struct{ MatchLabels map[string]string }
						}
						Ports []struct{ Port string }
					}
				}
			}
			if err := yaml.Unmarshal([]byte(doc), &v); err != nil {
				t.Fatal(err)
			}
			if v.Kind != "NetworkPolicy" {
				continue
			}
			policies++
			role := v.Spec.PodSelector.MatchLabels["app.kubernetes.io/component"]
			if len(v.Spec.PolicyTypes) != 1 || v.Spec.PolicyTypes[0] != "Ingress" || len(v.Spec.Ingress) != 1 || v.Spec.Ingress[0].Ports[0].Port != "http" {
				t.Fatalf("bad policy %+v", v)
			}
			from := v.Spec.Ingress[0].From
			if role == "controller" {
				if len(from) != 2 {
					t.Fatalf("controller peers: %+v", from)
				}
				for i, component := range []string{"api", "controller"} {
					labels := from[i].PodSelector.MatchLabels
					if labels["app.kubernetes.io/component"] != component || labels["app.kubernetes.io/instance"] != "test" {
						t.Fatalf("unscoped peer: %v", labels)
					}
				}
			} else if len(from) != 0 {
				t.Fatal("public role blocked by default")
			}
		}
		want := 1
		if mode == "split" {
			want = 3
		}
		if policies != want {
			t.Fatalf("got %d policies want %d", policies, want)
		}
	}
}
