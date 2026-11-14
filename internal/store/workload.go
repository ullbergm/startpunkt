package store

import "github.com/ullbergm/startpunkt/internal/tile"

// SetWorkload records source resource links and workload readiness only if
// the tile still describes the source and dependencies that were evaluated.
// A changed source is evaluated by the watcher's next event, not overwritten
// by an answer based on its earlier snapshot.
func (s *Store) SetWorkload(expected tile.Tile, consoleURL string, workload *tile.Workload) {
	s.mu.Lock()
	defer s.mu.Unlock()
	t, ok := s.tiles[expected.ID]
	if !ok || t.URL != expected.URL || t.Source != expected.Source || !tile.SameWorkloadRefs(t.WorkloadRefs, expected.WorkloadRefs) {
		return
	}
	next := t
	next.ConsoleURL = consoleURL
	next.Workload = workload
	if tile.Equal(t, next) {
		return
	}
	s.tiles[t.ID] = next
	s.publish([]Event{{Type: EventUpsert, ID: t.ID, Tile: next}})
}
