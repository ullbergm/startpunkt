package us.ullberg.startpunkt.objects;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.quarkus.runtime.annotations.RegisterForReflection;
import us.ullberg.startpunkt.crd.v1alpha4.BookmarkSpec;

/**
 * Wrapper for BookmarkSpec that adds Kubernetes metadata fields. This class is used for API
 * responses only and does not modify the CRD. The metadata fields (namespace, resourceName,
 * hasOwnerReferences) are added to support the edit interface, allowing identification and
 * modification of the underlying Kubernetes objects.
 */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
@RegisterForReflection(registerFullHierarchy = true)
public class BookmarkSpecWithMetadata extends BookmarkSpec {

  /** The Kubernetes namespace of the underlying resource. */
  @JsonProperty("namespace")
  private String namespace;

  /** The Kubernetes metadata.name (resource name) of the underlying object. */
  @JsonProperty("resourceName")
  private String resourceName;

  /** Whether the resource has owner references (true means it's managed by another resource). */
  @JsonProperty("hasOwnerReferences")
  private Boolean hasOwnerReferences;

  /** Default constructor. */
  public BookmarkSpecWithMetadata() {
    super();
  }

  /**
   * Creates a wrapper from an existing BookmarkSpec, copying all fields.
   *
   * @param spec the BookmarkSpec to wrap
   */
  public BookmarkSpecWithMetadata(BookmarkSpec spec) {
    this.name = spec.getName();
    this.setGroup(spec.getGroup());
    this.setIcon(spec.getIcon());
    this.setUrl(spec.getUrl());
    this.setInfo(spec.getInfo());
    this.setTargetBlank(spec.getTargetBlank());
    this.setLocation(spec.getLocation());
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
}
