// Package metrics exposes a small, bounded Prometheus registry without a
// runtime dependency. It never labels metrics with URLs, errors or secrets.
package metrics

import (
	"fmt"
	"math"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"

	"github.com/ullbergm/startpunkt/internal/store"
)

type definition struct {
	help, kind, label string
	values            []string
}

var definitions = map[string]definition{
	"startpunkt_probes_total":              {"Completed availability probes.", "counter", "result", []string{"available", "unavailable"}},
	"startpunkt_probe_duration_seconds":    {"Duration of availability probes in seconds.", "histogram", "result", []string{"available", "unavailable"}},
	"startpunkt_event_streams":             {"Currently open outgoing event streams.", "gauge", "", nil},
	"startpunkt_follower_reconnects_total": {"Follower reconnection attempts after a stream ended.", "counter", "kind", []string{"controller", "remote"}},
	"startpunkt_settings_errors_total":     {"Rejected settings and failures reading or following settings.", "counter", "", nil},
	"startpunkt_status_errors_total":       {"Failed Kubernetes status writes.", "counter", "", nil},
}
var bounds = []float64{.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10, 30}

type sample struct {
	value, sum float64
	count      uint64
	buckets    []uint64
}
type registry struct {
	sync.Mutex
	samples map[string]*sample
}

var global = newRegistry()

func newRegistry() *registry {
	r := &registry{samples: map[string]*sample{}}
	for name, d := range definitions {
		if d.label == "" {
			r.samples[name] = &sample{buckets: make([]uint64, len(bounds))}
		} else {
			for _, value := range d.values {
				r.samples[name+"{"+d.label+"="+quote(value)+"}"] = &sample{buckets: make([]uint64, len(bounds))}
			}
		}
	}
	return r
}
func quote(value string) string {
	return `"` + strings.NewReplacer(`\`, `\\`, "\n", `\n`, `"`, `\"`).Replace(value) + `"`
}
func key(name string, labels []string) (string, bool) {
	d, ok := definitions[name]
	if !ok {
		return "", false
	}
	if d.label == "" {
		return name, len(labels) == 0
	}
	if len(labels) != 2 || labels[0] != d.label {
		return "", false
	}
	for _, value := range d.values {
		if value == labels[1] {
			return name + "{" + d.label + "=" + quote(value) + "}", true
		}
	}
	return "", false
}

// Inc increments a supported counter by one. Labels alternate name and value.
func Inc(name string, labels ...string) { Add(name, 1, labels...) }

// Add changes a supported gauge or counter. Negative counter deltas and
// unknown metric names or label values are ignored, bounding cardinality.
func Add(name string, delta float64, labels ...string) {
	k, ok := key(name, labels)
	if !ok || math.IsNaN(delta) || math.IsInf(delta, 0) {
		return
	}
	d := definitions[name]
	if d.kind == "histogram" || (d.kind == "counter" && delta < 0) {
		return
	}
	global.Lock()
	global.samples[k].value += delta
	global.Unlock()
}

// Observe records a duration for a supported histogram.
func Observe(name string, seconds float64, labels ...string) {
	k, ok := key(name, labels)
	if !ok || definitions[name].kind != "histogram" || seconds < 0 || math.IsNaN(seconds) || math.IsInf(seconds, 0) {
		return
	}
	global.Lock()
	defer global.Unlock()
	s := global.samples[k]
	s.count++
	s.sum += seconds
	for i, bound := range bounds {
		if seconds <= bound {
			s.buckets[i]++
		}
	}
}
func metadata(b *strings.Builder, name, help, kind string) {
	fmt.Fprintf(b, "# HELP %s %s\n# TYPE %s %s\n", name, help, name, kind)
}
func (r *registry) write(b *strings.Builder) {
	r.Lock()
	defer r.Unlock()
	names := make([]string, 0, len(definitions))
	for name := range definitions {
		names = append(names, name)
	}
	sort.Strings(names)
	for _, name := range names {
		d := definitions[name]
		metadata(b, name, d.help, d.kind)
		keys := []string{name}
		if d.label != "" {
			keys = nil
			for _, v := range d.values {
				keys = append(keys, name+"{"+d.label+"="+quote(v)+"}")
			}
		}
		for _, k := range keys {
			s := r.samples[k]
			if d.kind != "histogram" {
				fmt.Fprintf(b, "%s %g\n", k, s.value)
				continue
			}
			labels := ""
			if strings.Contains(k, "{") {
				labels = strings.TrimSuffix(strings.SplitN(k, "{", 2)[1], "}")
			}
			prefix := ""
			if labels != "" {
				prefix = labels + ","
			}
			for i, bound := range bounds {
				fmt.Fprintf(b, "%s_bucket{%sle=%s} %d\n", name, prefix, quote(strconv.FormatFloat(bound, 'g', -1, 64)), s.buckets[i])
			}
			fmt.Fprintf(b, "%s_bucket{%sle=\"+Inf\"} %d\n", name, prefix, s.count)
			suffix := ""
			if labels != "" {
				suffix = "{" + labels + "}"
			}
			fmt.Fprintf(b, "%s_sum%s %g\n%s_count%s %d\n", name, suffix, s.sum, name, suffix, s.count)
		}
	}
}

// Handler serves Prometheus text format 0.0.4. Store gauges are taken from
// one consistent snapshot. A nil store is valid for the web role.
func Handler(tiles *store.Store) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		var b strings.Builder
		global.write(&b)
		if tiles != nil {
			snap := tiles.Snapshot()
			type tileKey struct{ cluster, source string }
			counts := map[tileKey]int{}
			for _, t := range snap.Tiles {
				counts[tileKey{t.Cluster, t.Source.Type}]++
			}
			keys := make([]tileKey, 0, len(counts))
			for k := range counts {
				keys = append(keys, k)
			}
			sort.Slice(keys, func(i, j int) bool {
				if keys[i].cluster != keys[j].cluster {
					return keys[i].cluster < keys[j].cluster
				}
				return keys[i].source < keys[j].source
			})
			metadata(&b, "startpunkt_tiles", "Current tiles by owning cluster and source.", "gauge")
			for _, k := range keys {
				fmt.Fprintf(&b, "startpunkt_tiles{cluster=%s,source=%s} %d\n", quote(k.cluster), quote(k.source), counts[k])
			}
			metadata(&b, "startpunkt_cluster_state", "Cluster state, one for the current state and zero for the others.", "gauge")
			for _, c := range snap.Clusters {
				for _, state := range []string{store.StateSyncing, store.StateConnected, store.StateStale} {
					value := 0
					if c.State == state {
						value = 1
					}
					fmt.Fprintf(&b, "startpunkt_cluster_state{cluster=%s,state=%s,local=%s} %d\n", quote(c.Name), quote(state), quote(strconv.FormatBool(c.Local)), value)
				}
			}
			metadata(&b, "startpunkt_ready", "Whether a complete local cluster state is available.", "gauge")
			ready, local := 0, false
			for _, c := range snap.Clusters {
				if !c.Local {
					continue
				}
				local = true
				if c.State == store.StateSyncing {
					local = false
					break
				}
			}
			if local {
				ready = 1
			}
			fmt.Fprintf(&b, "startpunkt_ready %d\n", ready)
		}
		w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		_, _ = w.Write([]byte(b.String()))
	})
}
