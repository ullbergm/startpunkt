package us.ullberg.startpunkt.objects.kubernetes;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import io.fabric8.kubernetes.api.model.GenericKubernetesResourceList;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.dsl.base.ResourceDefinitionContext;
import jakarta.annotation.Nullable;
import java.util.List;
import java.util.Map;
import us.ullberg.startpunkt.crd.ApplicationSpec;

/**
 * Abstract base class representing a Kubernetes custom resource wrapper. Provides common
 * functionality to retrieve application specifications and metadata from Kubernetes generic
 * resources.
 */
public abstract class BaseKubernetesObject implements KubernetesObject {
  private String group;
  private String version;
  private String pluralKind;

  /**
   * Constructs the wrapper with the specified API group, version, and plural kind.
   *
   * @param group the API group of the Kubernetes resource
   * @param version the API version of the Kubernetes resource
   * @param pluralKind the plural kind name of the Kubernetes resource
   */
  protected BaseKubernetesObject(String group, String version, String pluralKind) {
    this.group = group;
    this.version = version;
    this.pluralKind = pluralKind;
  }

  /**
   * Returns the API group of the Kubernetes resource.
   *
   * @return the API group string
   */
  public String getGroup() {
    return group;
  }

  /**
   * Returns the API version of the Kubernetes resource.
   *
   * @return the API version string
   */
  public String getVersion() {
    return version;
  }

  /**
   * Returns the plural kind name of the Kubernetes resource.
   *
   * @return the plural kind string
   */
  public String getPluralKind() {
    return pluralKind;
  }

  /**
   * Builds a ResourceDefinitionContext for the Kubernetes custom resource.
   *
   * @return the resource definition context
   */
  private ResourceDefinitionContext getResourceDefinitionContext() {
    return new ResourceDefinitionContext.Builder()
        .withGroup(group)
        .withVersion(version)
        .withPlural(pluralKind)
        .withNamespaced(true)
        .build();
  }

  /**
   * Retrieves a list of generic Kubernetes resources of this type, filtered by namespaces.
   *
   * @param client the Kubernetes client instance
   * @param anyNamespace if true, searches across all namespaces; otherwise uses matchNames
   * @param matchNames list of namespace names to filter on (used only if anyNamespace is false)
   * @return list of GenericKubernetesResource objects
   */
  protected GenericKubernetesResourceList getGenericKubernetesResources(
      KubernetesClient client, boolean anyNamespace, List<String> matchNames) {
    ResourceDefinitionContext resourceDefinitionContext = getResourceDefinitionContext();

    try {
      if (anyNamespace) {
        return client.genericKubernetesResources(resourceDefinitionContext).inAnyNamespace().list();
      }

      GenericKubernetesResourceList list = new GenericKubernetesResourceList();
      for (String namespace : matchNames) {
        list.getItems()
            .addAll(
                client
                    .genericKubernetesResources(resourceDefinitionContext)
                    .inNamespace(namespace)
                    .list()
                    .getItems());
      }

      return list;
    } catch (Exception ex) {
      // Returning empty list if retrieval fails. Consider improving error handling.
      return new GenericKubernetesResourceList();
    }
  }

  /**
   * Retrieves application specifications by mapping Kubernetes generic resources.
   *
   * @param client the Kubernetes client instance
   * @param anyNamespace whether to search across all namespaces
   * @param matchNames list of namespaces to filter on if anyNamespace is false
   * @return list of ApplicationSpec instances
   */
  public List<ApplicationSpec> getApplicationSpecs(
      KubernetesClient client, boolean anyNamespace, List<String> matchNames) {
    return getApplicationSpecs(client, anyNamespace, matchNames, null);
  }

  /**
   * Retrieves application specifications by mapping Kubernetes generic resources.
   *
   * @param client the Kubernetes client instance
   * @param anyNamespace whether to search across all namespaces
   * @param matchNames list of namespaces to filter on if anyNamespace is false
   * @param instanceFilter instance filter value, or null for no filtering
   * @return list of ApplicationSpec instances
   */
  public List<ApplicationSpec> getApplicationSpecs(
      KubernetesClient client,
      boolean anyNamespace,
      List<String> matchNames,
      String instanceFilter) {
    return getGenericKubernetesResources(client, anyNamespace, matchNames).getItems().stream()
        .filter(item -> shouldIncludeByInstance(item, instanceFilter))
        .map(this::mapToApplicationSpec)
        .toList();
  }

  /**
   * Determines whether to include an item based on instance filtering.
   *
   * @param item the Kubernetes resource
   * @param instanceFilter the instance filter value, or null for no filtering
   * @return true if the item should be included
   */
  protected boolean shouldIncludeByInstance(GenericKubernetesResource item, String instanceFilter) {
    if (instanceFilter == null || instanceFilter.isEmpty()) {
      return true; // No filtering
    }
    
    String itemInstance = getAppInstance(item);
    return itemInstance == null || itemInstance.equals(instanceFilter);
  }

  /**
   * Gets the instance annotation value from the resource. Default implementation returns null.
   * Subclasses can override this to provide instance extraction logic.
   *
   * @param item the Kubernetes resource
   * @return instance value or null
   */
  protected String getAppInstance(GenericKubernetesResource item) {
    return null;
  }

  /**
   * Maps a GenericKubernetesResource to an ApplicationSpec instance.
   *
   * @param item the Kubernetes generic resource
   * @return the ApplicationSpec mapped from the resource
   */
  protected ApplicationSpec mapToApplicationSpec(GenericKubernetesResource item) {
    return new ApplicationSpec(
        getAppName(item),
        getAppGroup(item),
        getAppIcon(item),
        getAppIconColor(item),
        getAppUrl(item),
        getAppInfo(item),
        getAppTargetBlank(item),
        getAppLocation(item),
        getAppEnabled(item),
        getAppInstance(item));
  }

  /**
   * Returns the annotations map from the Kubernetes resource metadata.
   *
   * @param item the Kubernetes generic resource
   * @return map of annotations or null if none present
   */
  protected Map<String, String> getAnnotations(GenericKubernetesResource item) {
    return item.getMetadata().getAnnotations();
  }

  /**
   * Returns the spec map from the Kubernetes resource.
   *
   * @param item the Kubernetes generic resource
   * @return spec map or null if not present
   */
  @SuppressWarnings("unchecked")
  protected Map<String, Object> getSpec(GenericKubernetesResource item) {
    Map<String, Object> props = getProps(item);
    if (props == null) {
      return Map.of();
    }
    return (Map<String, Object>) props.get("spec");
  }

  /**
   * Returns additional properties map from the Kubernetes resource.
   *
   * @param item the Kubernetes generic resource
   * @return map of additional properties or null if none present
   */
  protected Map<String, Object> getProps(GenericKubernetesResource item) {
    return item.getAdditionalProperties();
  }

  /**
   * Returns the application name. Defaults to resource metadata name in lowercase.
   *
   * @param item the Kubernetes generic resource
   * @return application name
   */
  protected String getAppName(GenericKubernetesResource item) {
    return item.getMetadata().getName().toLowerCase();
  }

  /**
   * Returns the application group. Defaults to resource namespace in lowercase.
   *
   * @param item the Kubernetes generic resource
   * @return application group
   */
  protected String getAppGroup(GenericKubernetesResource item) {
    return item.getMetadata().getNamespace().toLowerCase();
  }

  /**
   * Returns the application URL from the resource.
   *
   * @param item the Kubernetes generic resource
   * @return URL string or null if not provided
   */
  protected String getAppUrl(GenericKubernetesResource item) {
    return null;
  }

  /**
   * Returns the application icon from the resource.
   *
   * @param item the Kubernetes generic resource
   * @return icon string or null if not provided
   */
  protected String getAppIcon(GenericKubernetesResource item) {
    return null;
  }

  /**
   * Returns the application icon color from the resource.
   *
   * @param item the Kubernetes generic resource
   * @return icon color string or null if not provided
   */
  protected String getAppIconColor(GenericKubernetesResource item) {
    return null;
  }

  /**
   * Returns application info from the resource.
   *
   * @param item the Kubernetes generic resource
   * @return info string or null if not provided
   */
  protected String getAppInfo(GenericKubernetesResource item) {
    return null;
  }

  /**
   * Returns whether the application URL should open in a new tab.
   *
   * @param item the Kubernetes generic resource
   * @return Boolean flag or false if not specified
   */
  @Nullable
  protected Boolean getAppTargetBlank(GenericKubernetesResource item) {
    return false;
  }

  /**
   * Returns the sorting location for the application.
   *
   * @param item the Kubernetes generic resource
   * @return integer location, default is 1000
   */
  protected int getAppLocation(GenericKubernetesResource item) {
    return 1000;
  }

  /**
   * Returns whether the application is enabled.
   *
   * @param item the Kubernetes generic resource
   * @return Boolean flag or false if not specified
   */
  @Nullable
  protected Boolean getAppEnabled(GenericKubernetesResource item) {
    return false;
  }

  /**
   * Returns the protocol of the application URL.
   *
   * @param item the Kubernetes generic resource
   * @return protocol string or null if not specified
   */
  protected String getAppProtocol(GenericKubernetesResource item) {
    return null;
  }

  /**
   * Retrieves a string property from the spec or returns a fallback value.
   *
   * @param item the Kubernetes generic resource
   * @param key the key to lookup in the spec
   * @param fallback fallback value if key is absent
   * @return value from spec or fallback
   */
  protected String getOptionalSpecString(
      GenericKubernetesResource item, String key, String fallback) {
    var spec = getSpec(item);
    return spec != null && spec.containsKey(key) ? spec.get(key).toString() : fallback;
  }

  /**
   * Retrieves a boolean property from the spec or returns a fallback value.
   *
   * @param item the Kubernetes generic resource
   * @param key the key to lookup in the spec
   * @param fallback fallback boolean value if key is absent
   * @return boolean value from spec or fallback
   */
  protected Boolean getOptionalSpecBoolean(
      GenericKubernetesResource item, String key, Boolean fallback) {
    var spec = getSpec(item);
    return spec != null && spec.containsKey(key)
        ? Boolean.parseBoolean(spec.get(key).toString())
        : fallback;
  }

  /**
   * Retrieves an integer property from the spec or returns a fallback value.
   *
   * @param item the Kubernetes generic resource
   * @param key the key to lookup in the spec
   * @param fallback fallback integer value if key is absent
   * @return integer value from spec or fallback
   */
  protected Integer getOptionalSpecInteger(
      GenericKubernetesResource item, String key, Integer fallback) {
    var spec = getSpec(item);
    return spec != null && spec.containsKey(key)
        ? Integer.parseInt(spec.get(key).toString())
        : fallback;
  }
}
