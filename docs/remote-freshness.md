# Remote freshness

A disconnected remote keeps its last known tiles. The page shows when contact was last made and how long the data has been stale, both in the stale notice and in the cluster button’s description. A remote that has never answered says **Never reached**.

`lastSeen` is the last successful contact with the process supplying the feed, refreshed by snapshots and heartbeats. `staleSince` is when its data became stale. A reachable remote can itself have stale upstream data, so these times describe different things. Reconnection clears `staleSince` only when the supplied data is current; retries do not restart its age.

Both are optional RFC3339 timestamps on cluster state in `/api/v1`. They pass through split mode and federation. Missing or invalid timestamps are omitted from the display, and future clock skew is clamped when calculating the duration. Absolute times and durations follow the page’s language. While stale data is shown, the duration updates every 30 seconds without repeated live announcements.
