// Package v1 defines the Startpunkt custom resource types.
//
// The same spec shapes are served under the older versions v1alpha1 to
// v1alpha4, which only ever added fields, so these types read objects of any
// served version.
package v1

import metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

const (
	// Group is the API group of the Startpunkt custom resources.
	Group = "startpunkt.ullberg.us"
	// Version is the storage version defined by this package.
	Version = "v1"
	// FallbackVersion is used when Version is not served, which is the case
	// when running against the 4.x custom resource definitions.
	FallbackVersion = "v1alpha4"

	// ApplicationResource is the plural resource name of Application.
	ApplicationResource = "applications"
	// BookmarkResource is the plural resource name of Bookmark.
	BookmarkResource = "bookmarks"

	// DefaultLocation is the sort position of a tile that does not set one.
	DefaultLocation = 1000
)

// DeprecatedVersions are the versions of Application and Bookmark from
// before v1. They are served with the schema of v1.
var DeprecatedVersions = []string{"v1alpha1", "v1alpha2", "v1alpha3", "v1alpha4"}

// Application is a tile for an application, for one that no other resource
// in the cluster describes or that should be described by hand.
//
// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Title",type=string,JSONPath=`.spec.name`
// +kubebuilder:printcolumn:name="Group",type=string,JSONPath=`.spec.group`
// +kubebuilder:printcolumn:name="URL",type=string,JSONPath=`.status.url`
// +kubebuilder:printcolumn:name="Available",type=boolean,JSONPath=`.status.available`
// +kubebuilder:printcolumn:name="Age",type=date,JSONPath=`.metadata.creationTimestamp`
type Application struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// +optional
	Spec ApplicationSpec `json:"spec,omitempty"`
	// +optional
	Status ApplicationStatus `json:"status,omitempty"`
}

// ApplicationList is a list of Application resources.
// +kubebuilder:object:root=true
type ApplicationList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Application `json:"items"`
}

// Bookmark is a tile for a link to somewhere outside the cluster.
//
// +kubebuilder:object:root=true
// +kubebuilder:printcolumn:name="Title",type=string,JSONPath=`.spec.name`
// +kubebuilder:printcolumn:name="Group",type=string,JSONPath=`.spec.group`
// +kubebuilder:printcolumn:name="URL",type=string,JSONPath=`.spec.url`
// +kubebuilder:printcolumn:name="Age",type=date,JSONPath=`.metadata.creationTimestamp`
type Bookmark struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// +optional
	Spec BookmarkSpec `json:"spec,omitempty"`
}

// BookmarkList is a list of Bookmark resources.
// +kubebuilder:object:root=true
type BookmarkList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Bookmark `json:"items"`
}

// Link is a named secondary HTTP or HTTPS address on a tile.
type Link struct {
	// Name shown for the link.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:MinLength=1
	// +kubebuilder:validation:MaxLength=80
	Name string `json:"name"`
	// URL opened by the link.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:MaxLength=4096
	// +kubebuilder:validation:Pattern=`^https?://[^/]+`
	URL string `json:"url"`
}

// ApplicationSpec describes an application tile.
type ApplicationSpec struct {
	// Application name
	// +kubebuilder:validation:Required
	Name string `json:"name"`
	// Group the application belongs to. Defaults to the namespace.
	// +optional
	Group string `json:"group,omitempty"`
	// Application icon, e.g. 'mdi:home', 'https://example.com/icon.png'
	// +optional
	Icon string `json:"icon,omitempty"`
	// Application icon color, e.g. 'red'
	// +optional
	IconColor string `json:"iconColor,omitempty"`
	// Application URL
	// +optional
	URL string `json:"url,omitempty"`
	// Reference to read the URL from a different Kubernetes object
	// +optional
	URLFrom *URLFrom `json:"urlFrom,omitempty"`
	// Description of the application
	// +optional
	Info string `json:"info,omitempty"`
	// Secondary links, such as documentation, logs or the deployment.
	// +optional
	// +kubebuilder:validation:MaxItems=8
	Links []Link `json:"links,omitempty"`
	// Open the URL in a new tab
	// +optional
	TargetBlank *bool `json:"targetBlank,omitempty"`
	// Sorting order of the application
	// +optional
	Location int `json:"location,omitempty"`
	// Enable the application
	// +optional
	Enabled *bool `json:"enabled,omitempty"`
	// Root path to append to the URL
	// +optional
	RootPath string `json:"rootPath,omitempty"`
	// Comma-separated tags for filtering applications
	// +optional
	Tags string `json:"tags,omitempty"`
}

// URLFrom points at a field of another object that holds the URL.
type URLFrom struct {
	// API group of the referenced object
	// +optional
	APIGroup string `json:"apiGroup,omitempty"`
	// API version of the referenced object (e.g., 'v1')
	// +kubebuilder:validation:Required
	APIVersion string `json:"apiVersion"`
	// Kind of the referenced object (e.g., 'Service', 'ConfigMap')
	// +kubebuilder:validation:Required
	Kind string `json:"kind"`
	// Name of the referenced object
	// +kubebuilder:validation:Required
	Name string `json:"name"`
	// Namespace of the referenced object (defaults to same namespace)
	// +optional
	Namespace string `json:"namespace,omitempty"`
	// Path to the property in the referenced object (e.g., 'spec.host', 'data.url')
	// +kubebuilder:validation:Required
	Property string `json:"property"`
	// Optional URL template to build the final URL. Use {0} as placeholder
	// (e.g., 'https://{0}/dashboard/')
	// +optional
	URLTemplate string `json:"urlTemplate,omitempty"`
}

// BookmarkSpec describes a bookmark tile.
type BookmarkSpec struct {
	// Bookmark name
	// +kubebuilder:validation:Required
	Name string `json:"name"`
	// Group the bookmark belongs to
	// +kubebuilder:validation:Required
	Group string `json:"group"`
	// Bookmark icon, e.g. 'mdi:home', 'https://example.com/icon.png'
	// +optional
	Icon string `json:"icon,omitempty"`
	// Bookmark URL
	// +kubebuilder:validation:Required
	URL string `json:"url"`
	// Description of the bookmark
	// +optional
	Info string `json:"info,omitempty"`
	// Secondary links, such as documentation, logs or the deployment.
	// +optional
	// +kubebuilder:validation:MaxItems=8
	Links []Link `json:"links,omitempty"`
	// Open the URL in a new tab
	// +optional
	TargetBlank *bool `json:"targetBlank,omitempty"`
	// Sorting order of the bookmark
	// +optional
	Location int `json:"location,omitempty"`
}

// Condition types reported in ApplicationStatus.
const (
	// ConditionResolved says whether the spec could be turned into a tile.
	ConditionResolved = "Resolved"
	// ConditionAvailable says whether the URL answered the last probe.
	ConditionAvailable = "Available"
)

// ApplicationStatus is written by the controller. It changes only when one
// of its values changes; the time of the last probe is deliberately not part
// of it, because every write produces a watch event.
type ApplicationStatus struct {
	// URL the tile links to, after urlFrom and rootPath were applied.
	// +optional
	URL string `json:"url,omitempty"`
	// Whether the URL answered the last probe. Absent until it was probed.
	// +optional
	Available *bool `json:"available,omitempty"`
	// Resolved and Available conditions.
	// +optional
	// +listType=map
	// +listMapKey=type
	Conditions []Condition `json:"conditions,omitempty"`
}

// Condition has the fields of the standard Kubernetes condition.
type Condition struct {
	// +kubebuilder:validation:Required
	Type string `json:"type"`
	// +kubebuilder:validation:Required
	Status             string `json:"status"`
	Reason             string `json:"reason"`
	Message            string `json:"message"`
	LastTransitionTime string `json:"lastTransitionTime"`
	ObservedGeneration int64  `json:"observedGeneration,omitempty"`
}
