package v1

// LeaderElection coordinates probes and status writes between controller
// replicas. These are bootstrap settings, like the server address: they come
// from the environment or file, not from a Startpunkt resource.
type LeaderElection struct {
	// Enabled elects one controller replica using a coordination.k8s.io Lease.
	// Environment: STARTPUNKT_LEADERELECTION_ENABLED. Default: false.
	Enabled bool `json:"enabled"`
	// LeaseName is the Lease shared by replicas of this instance.
	// Environment: STARTPUNKT_LEADERELECTION_LEASENAME.
	LeaseName string `json:"leaseName"`
	// Namespace holds the Lease; empty uses the process's namespace.
	// Environment: STARTPUNKT_LEADERELECTION_NAMESPACE.
	Namespace string `json:"namespace"`
	// Identity distinguishes this process. Empty uses the hostname plus random
	// bytes, so two processes cannot accidentally share an identity.
	// Environment: STARTPUNKT_LEADERELECTION_IDENTITY.
	Identity string `json:"identity"`
	// AdvertiseURL is this pod's HTTP(S) address, reachable by the other
	// controllers. Followers use its public event stream to learn probe results.
	// Environment: STARTPUNKT_LEADERELECTION_ADVERTISEURL.
	AdvertiseURL string `json:"advertiseURL"`
}
