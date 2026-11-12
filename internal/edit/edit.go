// Package edit changes Application and Bookmark resources on behalf of the
// page: the HTTP endpoints, the check of the edit key, and the validation of
// what is written. The writing itself is behind the Editor interface, so
// that the process a browser talks to does not need access to the cluster.
package edit

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strings"

	apiv1 "github.com/ullbergm/startpunkt/api/v1"
)

// The kinds that can be edited. The values are the resource names and the
// path segments of the endpoints.
const (
	Applications = apiv1.ApplicationResource
	Bookmarks    = apiv1.BookmarkResource
)

// Resource is one Application or Bookmark as the endpoints read and write
// it.
type Resource struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
	// Spec is the spec of the resource, with the fields of api/v1.
	Spec json.RawMessage `json:"spec"`
}

// Editor reads and writes the resources. kind is Applications or Bookmarks.
// Errors that the caller of the API can do something about are of type
// *Error.
type Editor interface {
	Get(ctx context.Context, kind, namespace, name string) (Resource, error)
	// Create makes a new resource. An empty namespace means the default
	// one, and an empty name one derived from the spec's name.
	Create(ctx context.Context, kind string, r Resource) (Resource, error)
	// Update replaces the spec of an existing resource.
	Update(ctx context.Context, kind string, r Resource) (Resource, error)
	Delete(ctx context.Context, kind, namespace, name string) error
}

// Error is a failure with the HTTP status that describes it.
type Error struct {
	Status  int
	Message string
}

func (e *Error) Error() string { return e.Message }

// Errorf returns an *Error.
func Errorf(status int, format string, args ...any) *Error {
	return &Error{Status: status, Message: fmt.Sprintf(format, args...)}
}

// status returns the HTTP status and message for an error from an Editor.
// What is not an *Error is not the caller's doing and is not shown to them.
func status(err error) (int, string) {
	var e *Error
	if errors.As(err, &e) {
		return e.Status, e.Message
	}
	return http.StatusInternalServerError, "the change could not be made"
}

var dnsLabel = regexp.MustCompile(`^[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?$`)

// ValidName reports whether s can be the name of a resource or a namespace.
func ValidName(s string) bool { return dnsLabel.MatchString(s) }

// NameFor derives a resource name from the name shown on the tile.
func NameFor(title string) string {
	var b strings.Builder
	dash := false
	for _, r := range strings.ToLower(title) {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			if dash && b.Len() > 0 {
				b.WriteByte('-')
			}
			dash = false
			b.WriteRune(r)
		default:
			dash = true
		}
		if b.Len() >= 50 {
			break
		}
	}
	if b.Len() == 0 {
		return "tile"
	}
	return b.String()
}

// link reports whether s is an address a tile may link to. Only http and
// https are accepted: anything else a browser might run or hand to another
// program.
func link(s string) bool {
	u, err := url.Parse(strings.TrimSpace(s))
	return err == nil && (u.Scheme == "http" || u.Scheme == "https") && u.Host != ""
}

// Validate checks a spec of the given kind and returns it in the form it is
// written in. Unknown fields are refused rather than dropped, so that a
// caller finds out about a misspelt one.
func Validate(kind string, spec json.RawMessage) (map[string]any, error) {
	decode := func(into any) error {
		d := json.NewDecoder(bytes.NewReader(spec))
		d.DisallowUnknownFields()
		if err := d.Decode(into); err != nil {
			return Errorf(http.StatusBadRequest, "the spec is not valid: %v", err)
		}
		return nil
	}
	var typed any
	switch kind {
	case Applications:
		var s apiv1.ApplicationSpec
		if err := decode(&s); err != nil {
			return nil, err
		}
		s.Name, s.URL = strings.TrimSpace(s.Name), strings.TrimSpace(s.URL)
		if s.Name == "" {
			return nil, Errorf(http.StatusBadRequest, "name is required")
		}
		if s.URL == "" && s.URLFrom == nil {
			return nil, Errorf(http.StatusBadRequest, "url is required")
		}
		if s.URL != "" && !link(s.URL) {
			return nil, Errorf(http.StatusBadRequest, "url must be an http or https address")
		}
		if f := s.URLFrom; f != nil && (f.APIVersion == "" || f.Kind == "" || f.Name == "" || f.Property == "") {
			return nil, Errorf(http.StatusBadRequest, "urlFrom needs apiVersion, kind, name and property")
		}
		typed = s
	case Bookmarks:
		var s apiv1.BookmarkSpec
		if err := decode(&s); err != nil {
			return nil, err
		}
		s.Name, s.Group, s.URL = strings.TrimSpace(s.Name), strings.TrimSpace(s.Group), strings.TrimSpace(s.URL)
		if s.Name == "" || s.Group == "" {
			return nil, Errorf(http.StatusBadRequest, "name and group are required")
		}
		if !link(s.URL) {
			return nil, Errorf(http.StatusBadRequest, "url must be an http or https address")
		}
		typed = s
	default:
		return nil, Errorf(http.StatusNotFound, "not found")
	}
	// Through JSON, so that fields that are left out stay out.
	data, err := json.Marshal(typed)
	if err != nil {
		return nil, err
	}
	var out map[string]any
	if err := json.Unmarshal(data, &out); err != nil {
		return nil, err
	}
	return out, nil
}
