package chart_test

import (
	"strings"
	"testing"

	"sigs.k8s.io/yaml"
)

func TestReplicaAndElectionDefaults(t *testing.T) {
	for _, mode := range []string{"single", "split"} {
		for _, defaults := range []bool{true, false} {
			args := []string{"--set", "mode=" + mode}
			want := 2
			if !defaults {
				want = 1
				args = append(args, "--set", "replicas.all=1,replicas.controller=1,replicas.api=1,replicas.web=1,leaderElection.enabled=false")
			}
			out, err := render(t, args...)
			if err != nil {
				t.Fatalf("render: %v %s", err, out)
			}
			deployments, leases := 0, 0
			for _, doc := range strings.Split(string(out), "\n---") {
				var v struct {
					Kind  string
					Rules []policyRule
					Spec  struct {
						Replicas int
						Template struct {
							Spec struct {
								Containers []struct {
									Args []string
									Env  []scopeEnv
								}
							}
						}
					}
				}
				if err := yaml.Unmarshal([]byte(doc), &v); err != nil {
					t.Fatal(err)
				}
				for _, rule := range v.Rules {
					for _, resource := range rule.Resources {
						if resource == "leases" {
							leases++
						}
					}
				}
				if v.Kind != "Deployment" {
					continue
				}
				deployments++
				if v.Spec.Replicas != want {
					t.Fatalf("%s defaults=%v: replicas=%d want %d", mode, defaults, v.Spec.Replicas, want)
				}
				for _, c := range v.Spec.Template.Spec.Containers {
					if len(c.Args) == 0 {
						t.Fatal("missing role")
					}
					election := false
					for _, e := range c.Env {
						if e.Name == "STARTPUNKT_LEADERELECTION_ENABLED" && e.Value == "true" {
							election = true
						}
					}
					expected := defaults && (c.Args[0] == "all" || c.Args[0] == "controller")
					if election != expected {
						t.Fatalf("%s election=%v want %v", c.Args[0], election, expected)
					}
				}
			}
			if deployments == 0 || (defaults && leases == 0) || (!defaults && leases != 0) {
				t.Fatalf("deployments=%d lease rules=%d defaults=%v", deployments, leases, defaults)
			}
		}
	}
}
