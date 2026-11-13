package edit

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

// MinKeyLength is the shortest edit key that is accepted as configuration.
// The key is all that stands between a visitor and the cluster's resources.
const MinKeyLength = 16

// Handler serves the endpoints that change resources:
//
//	GET    /api/v1/unlock                           is the key valid?
//	POST   /api/v1/{kind}                           create
//	GET    /api/v1/{kind}/{namespace}/{name}        read the spec
//	PUT    /api/v1/{kind}/{namespace}/{name}        replace the spec
//	DELETE /api/v1/{kind}/{namespace}/{name}        delete
//	POST   /api/v1/check                            does an address answer?
//
// Every request needs the key as "Authorization: Bearer <key>".
type Handler struct {
	Editor Editor
	// Check reports whether something answers at an address, for the
	// editor to say so before the address is saved. Nil turns the endpoint
	// off.
	Check func(ctx context.Context, address string) (bool, error)
	// Key is the edit key. The handler must not be used with an empty one.
	Key string
	// Failures is how many wrong keys are tolerated in a row before
	// attempts are refused for a while, and Refill how long it takes to
	// earn one back. Zero means 10 and six seconds.
	Failures int
	Refill   time.Duration

	once   sync.Once
	digest [sha256.Size]byte
	mu     sync.Mutex
	left   float64
	last   time.Time
}

func (h *Handler) init() {
	h.once.Do(func() {
		h.digest = sha256.Sum256([]byte(h.Key))
		if h.Failures <= 0 {
			h.Failures = 10
		}
		if h.Refill <= 0 {
			h.Refill = 6 * time.Second
		}
		h.left, h.last = float64(h.Failures), time.Now()
	})
}

// Routes registers the endpoints on mux.
func (h *Handler) Routes(mux *http.ServeMux) {
	h.init()
	mux.HandleFunc("GET /api/v1/unlock", h.guard(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	if h.Check != nil {
		mux.HandleFunc("POST /api/v1/check", h.guard(h.check))
	}
	for _, kind := range []string{Applications, Bookmarks} {
		mux.HandleFunc("POST /api/v1/"+kind, h.guard(func(w http.ResponseWriter, r *http.Request) {
			in, ok := body(w, r)
			if !ok {
				return
			}
			out, err := h.Editor.Create(r.Context(), kind, in)
			respond(w, http.StatusCreated, out, err)
		}))
		item := "/api/v1/" + kind + "/{namespace}/{name}"
		mux.HandleFunc("GET "+item, h.guard(func(w http.ResponseWriter, r *http.Request) {
			out, err := h.Editor.Get(r.Context(), kind, r.PathValue("namespace"), r.PathValue("name"))
			respond(w, http.StatusOK, out, err)
		}))
		mux.HandleFunc("PUT "+item, h.guard(func(w http.ResponseWriter, r *http.Request) {
			in, ok := body(w, r)
			if !ok {
				return
			}
			in.Namespace, in.Name = r.PathValue("namespace"), r.PathValue("name")
			out, err := h.Editor.Update(r.Context(), kind, in)
			respond(w, http.StatusOK, out, err)
		}))
		mux.HandleFunc("DELETE "+item, h.guard(func(w http.ResponseWriter, r *http.Request) {
			if err := h.Editor.Delete(r.Context(), kind, r.PathValue("namespace"), r.PathValue("name")); err != nil {
				respond(w, 0, Resource{}, err)
				return
			}
			w.WriteHeader(http.StatusNoContent)
		}))
	}
}

// Checked is the body and the answer of POST /api/v1/check. Whether the
// address answers is all that is said about it: nothing of what it answered
// is passed on.
type Checked struct {
	URL       string `json:"url,omitempty"`
	Available bool   `json:"available"`
}

func (h *Handler) check(w http.ResponseWriter, r *http.Request) {
	var in Checked
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8<<10)).Decode(&in); err != nil || !link(in.URL) {
		writeError(w, http.StatusBadRequest, "url must be an http or https address")
		return
	}
	available, err := h.Check(r.Context(), strings.TrimSpace(in.URL))
	if err != nil {
		code, message := status(err)
		writeError(w, code, message)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(Checked{Available: available})
}

// guard lets a request through when it carries the key.
func (h *Handler) guard(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Answers depend on the key and must never be kept by a cache.
		w.Header().Set("Cache-Control", "no-store")
		if wait, limited := h.limited(); limited {
			w.Header().Set("Retry-After", strconv.Itoa(int(wait.Seconds())+1))
			writeError(w, http.StatusTooManyRequests, "too many attempts with a wrong key; try again shortly")
			return
		}
		given, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
		// Comparing digests takes the same time whatever the key's length
		// and wherever it first differs.
		sum := sha256.Sum256([]byte(given))
		if !ok || subtle.ConstantTimeCompare(sum[:], h.digest[:]) != 1 {
			h.failed()
			w.Header().Set("WWW-Authenticate", "Bearer")
			writeError(w, http.StatusUnauthorized, "the edit key is missing or wrong")
			return
		}
		next(w, r)
	}
}

// limited reports whether attempts are refused for now, and for how long.
// The count is for the whole process, not per client: behind a proxy the
// client's address is whatever the request claims. Someone who keeps
// guessing can therefore keep editing locked for everyone, and cannot do
// more than that.
func (h *Handler) limited() (time.Duration, bool) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.refill()
	if h.left >= 1 {
		return 0, false
	}
	return time.Duration((1 - h.left) * float64(h.Refill)), true
}

func (h *Handler) failed() {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.refill()
	h.left--
}

func (h *Handler) refill() {
	now := time.Now()
	h.left = min(float64(h.Failures), h.left+float64(now.Sub(h.last))/float64(h.Refill))
	h.last = now
}

func body(w http.ResponseWriter, r *http.Request) (Resource, bool) {
	var in Resource
	d := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10))
	d.DisallowUnknownFields()
	if err := d.Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "the body is not a resource: "+err.Error())
		return in, false
	}
	return in, true
}

func respond(w http.ResponseWriter, ok int, out Resource, err error) {
	if err != nil {
		code, message := status(err)
		writeError(w, code, message)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(ok)
	_ = json.NewEncoder(w).Encode(out)
}

func writeError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}
