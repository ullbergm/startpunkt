package follow

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"reflect"
	"sort"
	"strings"
	"time"

	"github.com/ullbergm/startpunkt/internal/store"
)

// ReportPath is where the controller takes reports about the remotes from
// the process that follows them. It is under /internal/, which is not
// routed from outside the cluster.
const ReportPath = "/internal/v1/remotes"

// RemoteReport is what the process that follows a remote knows about it.
type RemoteReport struct {
	Name string `json:"name"`
	// State is one of the store's cluster states.
	State string `json:"state"`
	// Tiles is how many of the remote's tiles are in the store.
	Tiles int `json:"tiles"`
	// Problem says why the remote is not connected, when that is known.
	Problem    string `json:"problem,omitempty"`
	LastSeen   string `json:"lastSeen,omitempty"`
	StaleSince string `json:"staleSince,omitempty"`
}

// Reporter tells whoever writes the status of the Remote resources how the
// remotes are doing: when something changes, and again at an interval, so
// that a receiver that started later, or missed a report, catches up, and
// can tell that the reporter is alive.
type Reporter struct {
	Store *store.Store
	// Problems returns why remotes are not connected, by name.
	Problems func() map[string]string
	// Send delivers a report. An error is logged, and the next report is
	// due at the interval.
	Send func(ctx context.Context, reports []RemoteReport) error
	Log  *slog.Logger
	// Interval is the longest time between two reports.
	Interval time.Duration
	// Settle is how long to wait after a change, so that a burst of
	// changes is one report.
	Settle time.Duration
}

// DefaultReportInterval is the longest time between two reports.
const DefaultReportInterval = 30 * time.Second

// Run blocks until ctx is cancelled.
func (r *Reporter) Run(ctx context.Context) {
	if r.Log == nil {
		r.Log = slog.Default()
	}
	if r.Interval <= 0 {
		r.Interval = DefaultReportInterval
	}
	if r.Settle <= 0 {
		r.Settle = time.Second
	}
	var last []RemoteReport
	var sent time.Time
	failing := false
	for ctx.Err() == nil {
		_, events, cancel := r.Store.Subscribe()
		due := time.NewTimer(0)
		settling := true
	stream:
		for {
			select {
			case <-ctx.Done():
				due.Stop()
				cancel()
				return
			case _, ok := <-events:
				if !ok {
					// Fell behind. Subscribe again and look at once.
					break stream
				}
				// Most changes are not about a remote. Look once the
				// burst is over rather than at every one.
				if !settling {
					settling = true
					due.Reset(r.Settle)
				}
			case <-due.C:
				settling = false
				now := r.summary()
				if reflect.DeepEqual(now, last) && time.Since(sent) < r.Interval {
					due.Reset(r.Interval - time.Since(sent))
					continue
				}
				sent = time.Now()
				if err := r.Send(ctx, now); err != nil {
					if !failing && ctx.Err() == nil {
						r.Log.Warn("reporting the state of the remotes failed; trying again", "error", err)
					}
					// Not delivered, so nothing to compare the next with.
					failing, last = true, nil
				} else {
					failing, last = false, now
				}
				due.Reset(r.Interval)
			}
		}
		due.Stop()
		cancel()
	}
}

// summary is one report per remote in the store, ordered by name.
func (r *Reporter) summary() []RemoteReport {
	snap := r.Store.Snapshot()
	count := map[string]int{}
	for _, t := range snap.Tiles {
		count[t.Cluster]++
	}
	var problems map[string]string
	if r.Problems != nil {
		problems = r.Problems()
	}
	reports := []RemoteReport{}
	for _, c := range snap.Clusters {
		if c.Local {
			continue
		}
		report := RemoteReport{Name: c.Name, State: c.State, Tiles: count[c.Name], LastSeen: c.LastSeen, StaleSince: c.StaleSince}
		if c.State != store.StateConnected {
			report.Problem = problems[c.Name]
		}
		reports = append(reports, report)
	}
	sort.Slice(reports, func(i, j int) bool { return reports[i].Name < reports[j].Name })
	return reports
}

// PostReports returns a Send function that delivers reports to the
// controller at upstream.
func PostReports(upstream string) func(ctx context.Context, reports []RemoteReport) error {
	client := &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			DialContext: (&net.Dialer{Timeout: 3 * time.Second}).DialContext,
		},
	}
	address := strings.TrimRight(upstream, "/") + ReportPath
	return func(ctx context.Context, reports []RemoteReport) error {
		body, err := json.Marshal(reports)
		if err != nil {
			return err
		}
		req, err := http.NewRequestWithContext(ctx, http.MethodPut, address, bytes.NewReader(body))
		if err != nil {
			return err
		}
		req.Header.Set("Content-Type", "application/json")
		resp, err := client.Do(req)
		if err != nil {
			return err
		}
		defer resp.Body.Close()
		_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 1<<16))
		if resp.StatusCode != http.StatusNoContent {
			return fmt.Errorf("unexpected status %s", resp.Status)
		}
		return nil
	}
}

// ReportHandler takes the reports that PostReports sends and hands them to
// receive. A nil receive accepts and drops them, for an instance that keeps
// no Remote resources.
func ReportHandler(receive func(reports []RemoteReport)) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("PUT "+ReportPath, func(w http.ResponseWriter, r *http.Request) {
		var reports []RemoteReport
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&reports); err != nil {
			http.Error(w, "the body is not a list of reports", http.StatusBadRequest)
			return
		}
		if receive != nil {
			receive(reports)
		}
		w.WriteHeader(http.StatusNoContent)
	})
	return mux
}
