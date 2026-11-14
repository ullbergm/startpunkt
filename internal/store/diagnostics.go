package store

import (
	"sort"

	"github.com/ullbergm/startpunkt/internal/tile"
)

// SetDiagnostic records a conversion error, or clears it when message is empty.
// It carries only source identity and an error, never the source object.
func (s *Store) SetDiagnostic(owner Owner, source tile.Source, message string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	id := tile.ID(owner.Cluster, source, 0)
	if message == "" {
		s.publish(s.removeDiagnostic(id))
		return
	}
	if len(message) > 4096 {
		message = message[:4096]
	}
	d := tile.Diagnostic{ID: id, Cluster: owner.Cluster, Source: source, Message: message}
	s.publish(s.upsertDiagnostic(LocalFeed, d))
}

func (s *Store) UpsertDiagnostic(d tile.Diagnostic) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.publish(s.upsertDiagnostic(LocalFeed, d))
}

func (s *Store) upsertDiagnostic(feed string, d tile.Diagnostic) []Event {
	s.diagnosticOrigin[d.ID] = feed
	if s.diagnostics[d.ID] == d {
		return nil
	}
	s.diagnostics[d.ID] = d
	return []Event{{Type: EventDiagnostic, Diagnostic: d}}
}

func (s *Store) RemoveDiagnostic(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.publish(s.removeDiagnostic(id))
}

func (s *Store) removeDiagnostic(id string) []Event {
	if _, ok := s.diagnostics[id]; !ok {
		return nil
	}
	delete(s.diagnostics, id)
	delete(s.diagnosticOrigin, id)
	return []Event{{Type: EventDiagnosticDelete, ID: id}}
}

func (s *Store) mirrorDiagnostics(feed string, diagnostics []tile.Diagnostic) []Event {
	var events []Event
	keep := map[string]bool{}
	for _, d := range diagnostics {
		keep[d.ID] = true
		events = append(events, s.upsertDiagnostic(feed, d)...)
	}
	for id, origin := range s.diagnosticOrigin {
		if origin == feed && !keep[id] {
			events = append(events, s.removeDiagnostic(id)...)
		}
	}
	return events
}

func (s *Store) diagnosticSnapshot() []tile.Diagnostic {
	out := make([]tile.Diagnostic, 0, len(s.diagnostics))
	for _, d := range s.diagnostics {
		out = append(out, d)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ID < out[j].ID })
	return out
}

func (s *Store) retainDiagnostics(cluster, typ string, keep func(Owner) bool) []Event {
	var events []Event
	for id, d := range s.diagnostics {
		owner := Owner{Cluster: d.Cluster, Type: d.Source.Type, Namespace: d.Source.Namespace, Name: d.Source.Name}
		if d.Cluster == cluster && d.Source.Type == typ && !keep(owner) {
			events = append(events, s.removeDiagnostic(id)...)
		}
	}
	return events
}
