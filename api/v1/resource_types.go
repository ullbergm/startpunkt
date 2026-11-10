package v1

import metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

const (
	// StartpunktResource is the plural resource name of Startpunkt.
	StartpunktResource = "startpunkts"
	// RemoteResource is the plural resource name of Remote.
	RemoteResource = "remotes"

	// ConditionConfigured says whether the settings of a Startpunkt
	// resource are valid and in use.
	ConditionConfigured = "Configured"
)

// Startpunkt holds the settings of one Startpunkt instance. The instance
// reads the resource of its own name in its own namespace, applies changes
// without a restart, and reports in the status whether the settings are in
// use.
//
// A setting that is left out keeps its default.
//
// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Configured",type=string,JSONPath=`.status.conditions[?(@.type=="Configured")].status`
// +kubebuilder:printcolumn:name="Reason",type=string,JSONPath=`.status.conditions[?(@.type=="Configured")].reason`
// +kubebuilder:printcolumn:name="Age",type=date,JSONPath=`.metadata.creationTimestamp`
type Startpunkt struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// +optional
	Spec StartpunktSpec `json:"spec,omitempty"`
	// +optional
	Status StartpunktStatus `json:"status,omitempty"`
}

// StartpunktSpec is the settings of an instance. The sections are those of
// the configuration file.
type StartpunktSpec struct {
	// The cluster this instance runs in.
	// +optional
	Cluster *Cluster `json:"cluster,omitempty"`
	// Which namespaces resources are read from.
	// +optional
	NamespaceSelector *NamespaceSelector `json:"namespaceSelector,omitempty"`
	// The resource types tiles are built from.
	// +optional
	Sources *Sources `json:"sources,omitempty"`
	// Probing of the tiles' URLs.
	// +optional
	Availability *Availability `json:"availability,omitempty"`
	// What is written back to the cluster.
	// +optional
	Status *StatusSettings `json:"status,omitempty"`
	// Where icons come from.
	// +optional
	Icons *Icons `json:"icons,omitempty"`
	// Settings of the page.
	// +optional
	Web *Web `json:"web,omitempty"`
}

// StartpunktStatus is written by the instance.
type StartpunktStatus struct {
	// The generation of the spec the conditions are about.
	// +optional
	ObservedGeneration int64 `json:"observedGeneration,omitempty"`
	// Configured is true when the spec is valid and in use. When it is
	// false the instance keeps running with the last valid settings, and
	// the message says what is wrong.
	// +optional
	// +listType=map
	// +listMapKey=type
	Conditions []Condition `json:"conditions,omitempty"`
}

// StartpunktList is a list of Startpunkt resources.
// +kubebuilder:object:root=true
type StartpunktList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Startpunkt `json:"items"`
}

// Remote is another Startpunkt instance whose tiles are shown next to this
// one's. Its name is the cluster name its tiles get here, whatever the
// remote calls itself; it is part of their ids, so it should not change.
// The instance in the same namespace subscribes to every Remote there, and
// stops when one is deleted.
//
// +kubebuilder:object:root=true
// +kubebuilder:printcolumn:name="URL",type=string,JSONPath=`.spec.url`
// +kubebuilder:printcolumn:name="Age",type=date,JSONPath=`.metadata.creationTimestamp`
type Remote struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// +kubebuilder:validation:Required
	Spec RemoteSpec `json:"spec"`
}

// RemoteSpec says where the remote is and what to take from it.
type RemoteSpec struct {
	// The base URL of the remote, as a browser would open it.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Pattern=`^https?://`
	URL string `json:"url"`
	// When set, only the tiles it describes are taken.
	// +optional
	Include *Selector `json:"include,omitempty"`
	// Tiles it describes are left out, also among the included.
	// +optional
	Exclude *Selector `json:"exclude,omitempty"`
}

// RemoteList is a list of Remote resources.
// +kubebuilder:object:root=true
type RemoteList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Remote `json:"items"`
}
