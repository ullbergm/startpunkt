package store

import "time"

func clusterTimes(next, previous Cluster) Cluster {
	if next.LastSeen == "" {
		next.LastSeen = previous.LastSeen
	}
	if next.State != StateStale {
		next.StaleSince = ""
	} else if next.StaleSince == "" {
		if previous.State == StateStale && previous.StaleSince != "" {
			next.StaleSince = previous.StaleSince
		} else {
			next.StaleSince = time.Now().UTC().Format(time.RFC3339Nano)
		}
	}
	return next
}

// TouchFeed records contact without changing the upstream's reported state.
// A live hub can still report stale data from its own controller.
func (s *Store) TouchFeed(feed string, at time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var events []Event
	when := at.UTC().Format(time.RFC3339Nano)
	for name, c := range s.clusters {
		if s.clusterOrigin[name] != feed || c.LastSeen == when {
			continue
		}
		c.LastSeen = when
		s.clusters[name] = c
		events = append(events, Event{Type: EventCluster, Cluster: c})
	}
	s.publish(events)
}
