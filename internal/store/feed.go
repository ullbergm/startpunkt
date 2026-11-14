package store

// ApplyFeed applies a generation's live changes as one atomic batch. The
// snapshot is installed with MirrorFrom before these events are subscribed to.
// This keeps a staged controller independent from the store served to clients.
func (s *Store) ApplyFeed(feed string, batch []Event) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var changes []Event
	for _, e := range batch {
		switch e.Type {
		case EventUpsert:
			if origin, exists := s.tileOrigin[e.Tile.ID]; exists && origin != feed {
				continue
			}
			s.tiles[e.Tile.ID] = e.Tile
			s.tileOrigin[e.Tile.ID] = feed
		case EventDelete:
			if origin, exists := s.tileOrigin[e.ID]; !exists || origin != feed {
				continue
			}
			delete(s.tiles, e.ID)
			delete(s.tileOrigin, e.ID)
		case EventCluster:
			if origin, exists := s.clusterOrigin[e.Cluster.Name]; exists && origin != feed {
				continue
			}
			e.Cluster = clusterTimes(e.Cluster, s.clusters[e.Cluster.Name])
			s.clusters[e.Cluster.Name] = e.Cluster
			s.clusterOrigin[e.Cluster.Name] = feed
		case EventClusterDelete:
			if origin, exists := s.clusterOrigin[e.Cluster.Name]; !exists || origin != feed {
				continue
			}
			delete(s.clusters, e.Cluster.Name)
			delete(s.clusterOrigin, e.Cluster.Name)
		default:
			continue
		}
		changes = append(changes, e)
	}
	s.publish(changes)
}
