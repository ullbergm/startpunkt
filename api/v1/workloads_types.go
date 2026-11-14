package v1

// Workloads configures readiness of the Kubernetes workloads behind tiles
// and links to the source resources in an OpenShift console.
type Workloads struct {
	// Enabled watches Services, Deployments and StatefulSets and shows their
	// readiness independently from HTTP availability. It is off by default.
	// Environment: STARTPUNKT_WORKLOADS_ENABLED.
	// +optional
	Enabled bool `json:"enabled"`
	// ConsoleURL is the base URL of the OpenShift console. Empty means no
	// resource links. This works independently of Enabled.
	// Environment: STARTPUNKT_WORKLOADS_CONSOLEURL.
	// +optional
	ConsoleURL string `json:"consoleURL,omitempty"`
}
