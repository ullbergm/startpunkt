// Package store holds every tile in memory. It is the only source the API
// reads from, and every consumer learns about a change from the same event.
package store

import (
	"sort"
	"sync"
	"time"

	"github.com/ullbergm/startpunkt/internal/tile"
)

// Owner identifies the object a set of tiles was derived from.
type Owner struct {
	Cluster   string
	Type      string
	Namespace string
	Name      string
}

// EventType is the kind of change an Event describes.
type EventType string

// Event types. The values are the event names used on the event stream.
const (
	EventUpsert  EventType = "tile.upsert"
	EventDelete  EventType = "tile.delete"
	EventCluster EventType = "cluster.status"
)

// Event is one change to the store. Tile is set for upserts, ID for upserts
// and deletes, Cluster for cluster status changes.
type Event struct {
	Type    EventType
	ID      string
	Tile    tile.Tile
	Cluster Cluster
}

// Cluster states.
const (
	// StateSyncing means the first full list of the cluster's resources has
	// not been read yet, so its tiles may be incomplete.
	StateSyncing = "syncing"
	// StateConnected means the tiles follow the cluster.
	StateConnected = "connected"
	// StateStale means the connection to the instance that owns the cluster
	// was lost and the tiles are the last known ones.
	StateStale = "stale"
)

// Cluster describes one cluster whose tiles are in the store. Its JSON form
// is part of the versioned API.
type Cluster struct {
	Name string `json:"name"`
	// Local is true for the cluster the tiles' owning process runs in, as
	// opposed to a cluster received through federation.
	Local bool   `json:"local"`
	State string `json:"state"`
}

// Snapshot is a consistent view of the store.
type Snapshot struct {
	// Tiles are in display order.
	Tiles []tile.Tile
	// Clusters are ordered by name.
	Clusters []Cluster
}

// Store is safe for concurrent use.
type Store struct {
	mu       sync.RWMutex
	tiles    map[string]tile.Tile
	owned    map[Owner][]string
	clusters map[string]Cluster
	nextSub  int
	subs     map[int]chan []Event
}

// New returns an empty store.
func New() *Store {
	return &Store{
		tiles:    map[string]tile.Tile{},
		owned:    map[Owner][]string{},
		clusters: map[string]Cluster{},
		subs:     map[int]chan []Event{},
	}
}

// Set replaces the tiles derived from owner with tiles. Tiles that did not
// change produce no event. An empty slice removes the owner.
func (s *Store) Set(owner Owner, tiles []tile.Tile) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.publish(s.set(owner, tiles))
}

// Delete removes every tile derived from owner.
func (s *Store) Delete(owner Owner) {
	s.Set(owner, nil)
}

// Retain removes the owners of the given cluster and type for which keep
// returns false. It is used after a relist, to drop objects that disappeared
// while they were not being watched.
func (s *Store) Retain(cluster, typ string, keep func(Owner) bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var events []Event
	for owner := range s.owned {
		if owner.Cluster != cluster || owner.Type != typ || keep(owner) {
			continue
		}
		events = append(events, s.set(owner, nil)...)
	}
	s.publish(events)
}

func (s *Store) set(owner Owner, tiles []tile.Tile) []Event {
	var events []Event
	seen := make(map[string]bool, len(tiles))
	ids := make([]string, 0, len(tiles))
	for _, t := range tiles {
		if seen[t.ID] {
			continue
		}
		seen[t.ID] = true
		ids = append(ids, t.ID)
		old, ok := s.tiles[t.ID]
		if ok && old.URL == t.URL {
			// The source object does not know its availability. Keep what
			// the prober found for as long as the URL is the same.
			t.Available, t.LastProbe = old.Available, old.LastProbe
		}
		if ok && tile.Equal(old, t) {
			continue
		}
		s.tiles[t.ID] = t
		events = append(events, Event{Type: EventUpsert, ID: t.ID, Tile: t})
	}
	for _, id := range s.owned[owner] {
		if !seen[id] {
			delete(s.tiles, id)
			events = append(events, Event{Type: EventDelete, ID: id})
		}
	}
	if len(ids) == 0 {
		delete(s.owned, owner)
	} else {
		s.owned[owner] = ids
	}
	return events
}

// publish must be called with the lock held.
func (s *Store) publish(events []Event) {
	if len(events) == 0 {
		return
	}
	for id, ch := range s.subs {
		select {
		case ch <- events:
		default:
			// The subscriber is not keeping up. Close it so it reconnects
			// and starts again from a snapshot.
			close(ch)
			delete(s.subs, id)
		}
	}
}

// SetCluster records the state of a cluster. Nothing happens when it is
// unchanged.
func (s *Store) SetCluster(c Cluster) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.clusters[c.Name] == c {
		return
	}
	s.clusters[c.Name] = c
	s.publish([]Event{{Type: EventCluster, Cluster: c}})
}

// SetProbe records the availability of tiles. A tile whose availability is
// already the given value is left alone, so a probe that confirms what is
// known produces no event; LastProbe is therefore the time of the probe that
// established the current value. Unknown ids are ignored.
func (s *Store) SetProbe(ids []string, available bool, at time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var events []Event
	for _, id := range ids {
		t, ok := s.tiles[id]
		if !ok || (t.Available != nil && *t.Available == available) {
			continue
		}
		value, when := available, at
		t.Available, t.LastProbe = &value, &when
		s.tiles[id] = t
		events = append(events, Event{Type: EventUpsert, ID: id, Tile: t})
	}
	s.publish(events)
}

// Owned returns the tiles derived from owner, in the order they were set.
func (s *Store) Owned(owner Owner) []tile.Tile {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]tile.Tile, 0, len(s.owned[owner]))
	for _, id := range s.owned[owner] {
		out = append(out, s.tiles[id])
	}
	return out
}

// Upsert adds or replaces single tiles by id. It is for tiles mirrored from
// another instance, which arrive one at a time and are not tracked by owner.
func (s *Store) Upsert(tiles ...tile.Tile) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var events []Event
	for _, t := range tiles {
		if old, ok := s.tiles[t.ID]; ok && tile.Equal(old, t) {
			continue
		}
		s.tiles[t.ID] = t
		events = append(events, Event{Type: EventUpsert, ID: t.ID, Tile: t})
	}
	s.publish(events)
}

// Remove deletes single tiles by id.
func (s *Store) Remove(ids ...string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var events []Event
	for _, id := range ids {
		if _, ok := s.tiles[id]; ok {
			delete(s.tiles, id)
			events = append(events, Event{Type: EventDelete, ID: id})
		}
	}
	s.publish(events)
}

// Mirror makes the store hold exactly the given clusters and tiles, emitting
// events only for what differs. It is for a store that follows one other
// instance and applies that instance's snapshot.
func (s *Store) Mirror(snap Snapshot) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var events []Event
	keep := make(map[string]bool, len(snap.Tiles))
	for _, t := range snap.Tiles {
		keep[t.ID] = true
		if old, ok := s.tiles[t.ID]; ok && tile.Equal(old, t) {
			continue
		}
		s.tiles[t.ID] = t
		events = append(events, Event{Type: EventUpsert, ID: t.ID, Tile: t})
	}
	for id := range s.tiles {
		if !keep[id] {
			delete(s.tiles, id)
			events = append(events, Event{Type: EventDelete, ID: id})
		}
	}
	names := make(map[string]bool, len(snap.Clusters))
	for _, c := range snap.Clusters {
		names[c.Name] = true
		if s.clusters[c.Name] != c {
			s.clusters[c.Name] = c
			events = append(events, Event{Type: EventCluster, Cluster: c})
		}
	}
	for name := range s.clusters {
		if !names[name] {
			delete(s.clusters, name)
		}
	}
	s.owned = map[Owner][]string{}
	s.publish(events)
}

// MarkStale sets every cluster that is not already stale to stale.
func (s *Store) MarkStale() {
	s.mu.Lock()
	defer s.mu.Unlock()
	var events []Event
	for name, c := range s.clusters {
		if c.State != StateStale {
			c.State = StateStale
			s.clusters[name] = c
			events = append(events, Event{Type: EventCluster, Cluster: c})
		}
	}
	s.publish(events)
}

// Snapshot returns a consistent view of all tiles and clusters.
func (s *Store) Snapshot() Snapshot {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.snapshot()
}

func (s *Store) snapshot() Snapshot {
	snap := Snapshot{
		Tiles:    make([]tile.Tile, 0, len(s.tiles)),
		Clusters: make([]Cluster, 0, len(s.clusters)),
	}
	for _, t := range s.tiles {
		snap.Tiles = append(snap.Tiles, t)
	}
	sort.Slice(snap.Tiles, func(i, j int) bool { return tile.Less(snap.Tiles[i], snap.Tiles[j]) })
	for _, c := range s.clusters {
		snap.Clusters = append(snap.Clusters, c)
	}
	sort.Slice(snap.Clusters, func(i, j int) bool { return snap.Clusters[i].Name < snap.Clusters[j].Name })
	return snap
}

// Ready reports whether the store holds a complete view: at least one local
// cluster is known and none is still doing its initial sync. A stale cluster
// counts as ready, because its last known tiles are still worth serving.
func (s *Store) Ready() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	local := false
	for _, c := range s.clusters {
		if !c.Local {
			continue
		}
		if c.State == StateSyncing {
			return false
		}
		local = true
	}
	return local
}

// Subscribe returns the current snapshot and a channel of the changes that
// follow it, with nothing missed in between. The channel is closed when the
// subscriber falls too far behind or cancel is called.
func (s *Store) Subscribe() (snap Snapshot, events <-chan []Event, cancel func()) {
	s.mu.Lock()
	defer s.mu.Unlock()
	id := s.nextSub
	s.nextSub++
	ch := make(chan []Event, 64)
	s.subs[id] = ch
	return s.snapshot(), ch, func() {
		s.mu.Lock()
		defer s.mu.Unlock()
		if c, ok := s.subs[id]; ok {
			close(c)
			delete(s.subs, id)
		}
	}
}
