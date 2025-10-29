package us.ullberg.startpunkt.crd.v1alpha3;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.fabric8.generator.annotation.Required;
import io.quarkus.runtime.annotations.RegisterForReflection;

/**
 * Represents a reference to read the URL from a different Kubernetes object.
 *
 * <p>This allows the Application CRD to dynamically read the URL from another resource such as a
 * Service, ConfigMap, or any other Kubernetes object.
 */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
@RegisterForReflection(registerFullHierarchy = true)
public class UrlFrom {

  /** API group of the referenced object. */
  @JsonProperty("apiGroup")
  @JsonPropertyDescription("API group of the referenced object (e.g., 'v1', 'apps/v1')")
  private String apiGroup;

  /** API version of the referenced object. */
  @JsonProperty("apiVersion")
  @JsonPropertyDescription("API version of the referenced object (e.g., 'v1')")
  @Required
  private String apiVersion;

  /** Kind of the referenced object. */
  @JsonProperty("kind")
  @JsonPropertyDescription("Kind of the referenced object (e.g., 'Service', 'ConfigMap')")
  @Required
  private String kind;

  /** Name of the referenced object. */
  @JsonProperty("name")
  @JsonPropertyDescription("Name of the referenced object")
  @Required
  private String name;

  /** Namespace of the referenced object (defaults to same namespace as the Application). */
  @JsonProperty("namespace")
  @JsonPropertyDescription("Namespace of the referenced object (defaults to same namespace)")
  private String namespace;

  /** JSON path to the property in the referenced object that contains the hostname or URL. */
  @JsonProperty("property")
  @JsonPropertyDescription(
      "JSON path to the property in the referenced object (e.g., 'spec.host', 'data.url')")
  @Required
  private String property;

  /** Default constructor. */
  public UrlFrom() {}

  /**
   * Parameterized constructor.
   *
   * @param apiGroup API group of the referenced object
   * @param apiVersion API version of the referenced object
   * @param kind Kind of the referenced object
   * @param name Name of the referenced object
   * @param namespace Namespace of the referenced object
   * @param property JSON path to the property containing the URL
   */
  public UrlFrom(
      String apiGroup,
      String apiVersion,
      String kind,
      String name,
      String namespace,
      String property) {
    this.apiGroup = apiGroup;
    this.apiVersion = apiVersion;
    this.kind = kind;
    this.name = name;
    this.namespace = namespace;
    this.property = property;
  }

  /**
   * Gets the API group of the referenced object.
   *
   * @return API group
   */
  public String getApiGroup() {
    return apiGroup;
  }

  /**
   * Sets the API group of the referenced object.
   *
   * @param apiGroup API group
   */
  public void setApiGroup(String apiGroup) {
    this.apiGroup = apiGroup;
  }

  /**
   * Gets the API version of the referenced object.
   *
   * @return API version
   */
  public String getApiVersion() {
    return apiVersion;
  }

  /**
   * Sets the API version of the referenced object.
   *
   * @param apiVersion API version
   */
  public void setApiVersion(String apiVersion) {
    this.apiVersion = apiVersion;
  }

  /**
   * Gets the kind of the referenced object.
   *
   * @return kind
   */
  public String getKind() {
    return kind;
  }

  /**
   * Sets the kind of the referenced object.
   *
   * @param kind kind
   */
  public void setKind(String kind) {
    this.kind = kind;
  }

  /**
   * Gets the name of the referenced object.
   *
   * @return name
   */
  public String getName() {
    return name;
  }

  /**
   * Sets the name of the referenced object.
   *
   * @param name name
   */
  public void setName(String name) {
    this.name = name;
  }

  /**
   * Gets the namespace of the referenced object.
   *
   * @return namespace
   */
  public String getNamespace() {
    return namespace;
  }

  /**
   * Sets the namespace of the referenced object.
   *
   * @param namespace namespace
   */
  public void setNamespace(String namespace) {
    this.namespace = namespace;
  }

  /**
   * Gets the JSON path to the property containing the URL.
   *
   * @return property path
   */
  public String getProperty() {
    return property;
  }

  /**
   * Sets the JSON path to the property containing the URL.
   *
   * @param property property path
   */
  public void setProperty(String property) {
    this.property = property;
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }

    UrlFrom urlFrom = (UrlFrom) o;

    if (apiGroup != null ? !apiGroup.equals(urlFrom.apiGroup) : urlFrom.apiGroup != null) {
      return false;
    }
    if (apiVersion != null ? !apiVersion.equals(urlFrom.apiVersion) : urlFrom.apiVersion != null) {
      return false;
    }
    if (kind != null ? !kind.equals(urlFrom.kind) : urlFrom.kind != null) {
      return false;
    }
    if (name != null ? !name.equals(urlFrom.name) : urlFrom.name != null) {
      return false;
    }
    if (namespace != null ? !namespace.equals(urlFrom.namespace) : urlFrom.namespace != null) {
      return false;
    }
    return property != null ? property.equals(urlFrom.property) : urlFrom.property == null;
  }

  @Override
  public int hashCode() {
    int result = apiGroup != null ? apiGroup.hashCode() : 0;
    result = 31 * result + (apiVersion != null ? apiVersion.hashCode() : 0);
    result = 31 * result + (kind != null ? kind.hashCode() : 0);
    result = 31 * result + (name != null ? name.hashCode() : 0);
    result = 31 * result + (namespace != null ? namespace.hashCode() : 0);
    result = 31 * result + (property != null ? property.hashCode() : 0);
    return result;
  }

  @Override
  public String toString() {
    return "UrlFrom{"
        + "apiGroup='"
        + apiGroup
        + '\''
        + ", apiVersion='"
        + apiVersion
        + '\''
        + ", kind='"
        + kind
        + '\''
        + ", name='"
        + name
        + '\''
        + ", namespace='"
        + namespace
        + '\''
        + ", property='"
        + property
        + '\''
        + '}';
  }
}
