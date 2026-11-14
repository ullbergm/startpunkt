package edit

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// InternalPrefix is where the controller serves the endpoints for the api
// role of the same instance. It is under /internal/, which is not routed
// from outside the cluster. The controller checks the key as well, because
// anything inside the cluster can reach it.
const InternalPrefix = "/internal/v1/edit"

// Forwarder is an Editor that hands every call to the controller, for a
// process without access to the cluster.
type Forwarder struct {
	// Upstream is the base URL of the controller.
	Upstream string
	Key      string
	Client   *http.Client
}

// NewForwarder returns a Forwarder with a client that does not wait long.
func NewForwarder(upstream, key string) *Forwarder {
	return &Forwarder{Upstream: upstream, Key: key, Client: &http.Client{
		Timeout:   15 * time.Second,
		Transport: &http.Transport{DialContext: (&net.Dialer{Timeout: 3 * time.Second}).DialContext},
	}}
}

func (f *Forwarder) call(ctx context.Context, method string, in *Resource, segments ...string) (Resource, error) {
	var out Resource
	address := strings.TrimRight(f.Upstream, "/") + InternalPrefix + "/api/v1"
	for _, s := range segments {
		address += "/" + url.PathEscape(s)
	}
	var payload io.Reader
	if in != nil {
		data, err := json.Marshal(in)
		if err != nil {
			return out, err
		}
		payload = bytes.NewReader(data)
	}
	req, err := http.NewRequestWithContext(ctx, method, address, payload)
	if err != nil {
		return out, err
	}
	req.Header.Set("Authorization", "Bearer "+f.Key)
	if in != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := f.Client.Do(req)
	if err != nil {
		return out, Errorf(http.StatusBadGateway, "the controller cannot be reached; try again shortly")
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	switch {
	case resp.StatusCode == http.StatusNoContent:
		return out, nil
	case resp.StatusCode >= 200 && resp.StatusCode < 300:
		return out, json.Unmarshal(data, &out)
	case resp.StatusCode == http.StatusUnauthorized, resp.StatusCode == http.StatusTooManyRequests:
		// This process has already checked the visitor's key. If the
		// controller refuses ours, the two are configured differently.
		return out, Errorf(http.StatusBadGateway, "the controller did not accept the edit key of this process")
	}
	var problem struct {
		Error string `json:"error"`
	}
	if json.Unmarshal(data, &problem) != nil || problem.Error == "" {
		problem.Error = "the change could not be made"
	}
	return out, Errorf(resp.StatusCode, "%s", problem.Error)
}

// Get implements Editor.
func (f *Forwarder) Get(ctx context.Context, kind, namespace, name string) (Resource, error) {
	return f.call(ctx, http.MethodGet, nil, kind, namespace, name)
}

// Create implements Editor.
func (f *Forwarder) Create(ctx context.Context, kind string, r Resource) (Resource, error) {
	return f.call(ctx, http.MethodPost, &r, kind)
}

// Update implements Editor.
func (f *Forwarder) Update(ctx context.Context, kind string, r Resource) (Resource, error) {
	in := Resource{Spec: r.Spec, ResourceVersion: r.ResourceVersion}
	return f.call(ctx, http.MethodPut, &in, kind, r.Namespace, r.Name)
}

// Delete implements Editor.
func (f *Forwarder) Delete(ctx context.Context, kind, namespace, name string) error {
	_, err := f.call(ctx, http.MethodDelete, nil, kind, namespace, name)
	return err
}

// Check asks the controller whether something answers at an address. The
// controller is the one that probes, with the instance's settings for it.
func (f *Forwarder) Check(ctx context.Context, address string) (bool, error) {
	data, err := json.Marshal(Checked{URL: address})
	if err != nil {
		return false, err
	}
	target := strings.TrimRight(f.Upstream, "/") + InternalPrefix + "/api/v1/check"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, target, bytes.NewReader(data))
	if err != nil {
		return false, err
	}
	req.Header.Set("Authorization", "Bearer "+f.Key)
	req.Header.Set("Content-Type", "application/json")
	resp, err := f.Client.Do(req)
	if err != nil {
		return false, Errorf(http.StatusBadGateway, "the controller cannot be reached; try again shortly")
	}
	defer resp.Body.Close()
	var out Checked
	if resp.StatusCode != http.StatusOK || json.NewDecoder(io.LimitReader(resp.Body, 8<<10)).Decode(&out) != nil {
		return false, Errorf(http.StatusBadGateway, "the address could not be checked")
	}
	return out.Available, nil
}

// Internal returns the handler the controller serves under /internal/ for
// Forwarders.
func Internal(h *Handler) http.Handler {
	mux := http.NewServeMux()
	h.Routes(mux)
	return http.StripPrefix(InternalPrefix, mux)
}
