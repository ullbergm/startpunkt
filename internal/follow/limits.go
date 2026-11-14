package follow

import (
	"bufio"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/ullbergm/startpunkt/internal/api"
	"github.com/ullbergm/startpunkt/internal/store"
	"github.com/ullbergm/startpunkt/internal/tile"
)

const (
	DefaultMaxEventBytes = 8 << 20
	DefaultMaxTiles      = 10000
)

func (f *Follower) eventLimit() int {
	if f.MaxEventBytes > 0 {
		return f.MaxEventBytes
	}
	return DefaultMaxEventBytes
}
func (f *Follower) tileLimit() int {
	if f.MaxTiles > 0 {
		return f.MaxTiles
	}
	return DefaultMaxTiles
}

// readLine stops allocating as soon as the bound is exceeded, including for
// an upstream that never sends a newline. ReadString cannot provide that bound.
func readLine(r *bufio.Reader, limit int) (string, error) {
	var b strings.Builder
	for {
		part, err := r.ReadSlice('\n')
		if len(part) > limit-b.Len() {
			return "", fmt.Errorf("line exceeds %d bytes", limit)
		}
		b.Write(part)
		if errors.Is(err, bufio.ErrBufferFull) {
			continue
		}
		if err == io.EOF && b.Len() > 0 {
			return "", io.ErrUnexpectedEOF
		}
		return b.String(), err
	}
}

func validateCluster(c store.Cluster) error {
	if c.Name == "" || len(c.Name) > 256 || strings.ContainsAny(c.Name, "/\r\n\x00") {
		return errors.New("invalid cluster name")
	}
	for _, raw := range []string{c.LastSeen, c.StaleSince} {
		if raw == "" {
			continue
		}
		if len(raw) > 64 {
			return errors.New("invalid cluster timestamp")
		}
		if _, err := time.Parse(time.RFC3339Nano, raw); err != nil {
			return errors.New("invalid cluster timestamp")
		}
	}
	switch c.State {
	case store.StateConnected, store.StateSyncing, store.StateStale:
	default:
		return errors.New("invalid cluster state")
	}
	return nil
}

func validateTile(t tile.Tile) error {
	if t.ID == "" || len(t.ID) > 2048 || t.Cluster == "" || !strings.HasPrefix(t.ID, t.Cluster+"/") {
		return errors.New("invalid tile identity")
	}
	if t.Kind != tile.KindApplication && t.Kind != tile.KindBookmark {
		return errors.New("invalid tile kind")
	}
	if !tile.ValidURL(t.URL) || len(t.URL) > 4096 {
		return errors.New("tile URL must be an http or https address of at most 4096 bytes")
	}
	for _, value := range []string{t.Name, t.Group, t.Icon, t.IconColor, t.Info, t.Source.Type, t.Source.Kind, t.Source.Version, t.Source.Namespace, t.Source.Name} {
		if len(value) > 4096 {
			return errors.New("tile field exceeds 4096 bytes")
		}
	}
	if len(t.Tags) > 128 {
		return errors.New("tile has too many tags")
	}
	for _, tag := range t.Tags {
		if len(tag) > 256 {
			return errors.New("tile tag exceeds 256 bytes")
		}
	}
	if t.ConsoleURL != "" && (len(t.ConsoleURL) > 4096 || !tile.ValidURL(t.ConsoleURL)) {
		return errors.New("invalid console URL")
	}
	if w := t.Workload; w != nil {
		switch w.State {
		case "ready", "starting", "degraded", "unknown":
		default:
			return errors.New("invalid workload state")
		}
		if w.Ready < 0 || w.Desired < 0 || w.Ready > w.Desired {
			return errors.New("invalid workload replica counts")
		}
	}
	return tile.ValidateLinks(t.Links)
}

func (f *Follower) validateState(state api.State) error {
	if len(state.Tiles) > f.tileLimit() {
		return fmt.Errorf("snapshot exceeds %d tiles", f.tileLimit())
	}
	if len(state.Clusters) > 1024 {
		return errors.New("snapshot exceeds 1024 clusters")
	}
	clusters := map[string]bool{}
	for _, c := range state.Clusters {
		if err := validateCluster(c); err != nil {
			return err
		}
		if clusters[c.Name] {
			return errors.New("duplicate cluster name")
		}
		clusters[c.Name] = true
	}
	if f.Remote == "" {
		return nil
	}
	ids := map[string]bool{}
	for _, t := range state.Tiles {
		if err := validateTile(t); err != nil {
			return err
		}
		if !clusters[t.Cluster] {
			return errors.New("tile belongs to an unknown cluster")
		}
		if ids[t.ID] {
			return errors.New("duplicate tile identity")
		}
		ids[t.ID] = true
	}
	return nil
}

func (f *Follower) trackID(id string) error {
	if f.received == nil {
		f.received = map[string]bool{}
	}
	if !f.received[id] && len(f.received) >= f.tileLimit() {
		return fmt.Errorf("upstream exceeds %d tiles", f.tileLimit())
	}
	f.received[id] = true
	return nil
}
