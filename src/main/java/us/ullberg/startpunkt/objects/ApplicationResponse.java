package us.ullberg.startpunkt.objects;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.quarkus.runtime.annotations.RegisterForReflection;
import us.ullberg.startpunkt.crd.v1alpha4.ApplicationSpec;

/**
 * Response DTO for Application resources that enriches the base ApplicationSpec with runtime
 * availability status and Kubernetes metadata. This class is used for API responses only and does
 * not modify the CRD. The availability status is computed at runtime by the
 * AvailabilityCheckService, and the metadata fields enable the edit interface.
 */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
@RegisterForReflection(registerFullHierarchy = true)
public class ApplicationResponse extends ApplicationSpec {

  /** Whether the application is currently available (reachable). */
  @JsonProperty("available")
  private Boolean available;

  /** The Kubernetes namespace of the underlying resource. */
  @JsonProperty("namespace")
  private String namespace;

  /** The Kubernetes metadata.name (resource name) of the underlying object. */
  @JsonProperty("resourceName")
  private String resourceName;

  /** Whether the resource has owner references (true means it's managed by another resource). */
  @JsonProperty("hasOwnerReferences")
  private Boolean hasOwnerReferences;

  /** The cluster name this application belongs to (for multi-cluster support). */
  @JsonProperty("cluster")
  private String cluster;

  /** Default constructor. */
  public ApplicationResponse() {
    super();
  }

  /**
   * Creates a response DTO from an existing ApplicationSpec, copying all fields.
   *
   * @param spec the ApplicationSpec to wrap
   */
  public ApplicationResponse(ApplicationSpec spec) {
    this.name = spec.getName();
    this.setGroup(spec.getGroup());
    this.setIcon(spec.getIcon());
    this.setIconColor(spec.getIconColor());
    this.setUrl(spec.getUrl());
    this.setUrlFrom(spec.getUrlFrom());
    this.setInfo(spec.getInfo());
    this.setTargetBlank(spec.getTargetBlank());
    this.setLocation(spec.getLocation());
    this.setEnabled(spec.getEnabled());
    this.setRootPath(spec.getRootPath());
    this.setTags(spec.getTags());
  }

  /**
   * Gets whether the application is currently available.
   *
   * @return true if the application is available, null if not yet checked
   */
  public Boolean getAvailable() {
    return available;
  }

  /**
   * Sets whether the application is currently available.
   *
   * @param available whether the application is available
   */
  public void setAvailable(Boolean available) {
    this.available = available;
  }

  /**
   * Gets the Kubernetes namespace of the underlying resource.
   *
   * @return the namespace
   */
  public String getNamespace() {
    return namespace;
  }

  /**
   * Sets the Kubernetes namespace of the underlying resource.
   *
   * @param namespace the namespace to set
   */
  public void setNamespace(String namespace) {
    this.namespace = namespace;
  }

  /**
   * Gets the Kubernetes resource name (metadata.name) of the underlying object.
   *
   * @return the resource name
   */
  public String getResourceName() {
    return resourceName;
  }

  /**
   * Sets the Kubernetes resource name (metadata.name) of the underlying object.
   *
   * @param resourceName the resource name to set
   */
  public void setResourceName(String resourceName) {
    this.resourceName = resourceName;
  }

  /**
   * Gets whether the resource has owner references.
   *
   * @return true if the resource has owner references, false otherwise
   */
  public Boolean getHasOwnerReferences() {
    return hasOwnerReferences;
  }

  /**
   * Sets whether the resource has owner references.
   *
   * @param hasOwnerReferences true if the resource has owner references
   */
  public void setHasOwnerReferences(Boolean hasOwnerReferences) {
    this.hasOwnerReferences = hasOwnerReferences;
  }

  /**
   * Gets the cluster name this application belongs to.
   *
   * @return the cluster name
   */
  public String getCluster() {
    return cluster;
  }

  /**
   * Sets the cluster name this application belongs to.
   *
   * @param cluster the cluster name to set
   */
  public void setCluster(String cluster) {
    this.cluster = cluster;
  }
}
