package us.ullberg.startpunkt.objects.kubernetes;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import io.fabric8.kubernetes.api.model.GenericKubernetesResourceList;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.dsl.base.ResourceDefinitionContext;
import io.quarkus.logging.Log;
import jakarta.annotation.Nullable;
import java.util.List;
import java.util.Map;
import us.ullberg.startpunkt.crd.v1alpha4.ApplicationSpec;

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
    Log.debugf("Fetching %s/%s resources from Kubernetes", group, pluralKind);

    try {
      if (anyNamespace) {
        Log.debug("Searching across all namespaces");
        GenericKubernetesResourceList result =
            client.genericKubernetesResources(resourceDefinitionContext).inAnyNamespace().list();
        Log.debugf("Found %d %s resources in all namespaces", result.getItems().size(), pluralKind);
        return result;
      }

      GenericKubernetesResourceList list = new GenericKubernetesResourceList();
      Log.debugf("Searching in specific namespaces: %s", matchNames);
      for (String namespace : matchNames) {
        var items =
            client
                .genericKubernetesResources(resourceDefinitionContext)
                .inNamespace(namespace)
                .list()
                .getItems();
        Log.debugf("Found %d %s resources in namespace: %s", items.size(), pluralKind, namespace);
        list.getItems().addAll(items);
      }

      Log.debugf("Total %s resources found: %d", pluralKind, list.getItems().size());
      return list;
    } catch (Exception ex) {
      Log.warnf("Error retrieving %s/%s resources: %s", group, pluralKind, ex.getMessage());
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
    return getGenericKubernetesResources(client, anyNamespace, matchNames).getItems().stream()
        .map(this::mapToApplicationSpec)
        .toList();
  }

  /**
   * Retrieves application specifications with metadata by mapping Kubernetes generic resources.
   *
   * @param client the Kubernetes client instance
   * @param anyNamespace whether to search across all namespaces
   * @param matchNames list of namespaces to filter on if anyNamespace is false
   * @return list of ApplicationResponse instances with metadata populated
   */
  public List<us.ullberg.startpunkt.objects.ApplicationResponse> getApplicationSpecsWithMetadata(
      KubernetesClient client, boolean anyNamespace, List<String> matchNames) {
    return getGenericKubernetesResources(client, anyNamespace, matchNames).getItems().stream()
        .map(this::mapToApplicationSpecWithMetadata)
        .toList();
  }

  /**
   * Maps a GenericKubernetesResource to an ApplicationResponse instance with metadata.
   *
   * @param item the Kubernetes generic resource
   * @return the ApplicationResponse with metadata populated
   */
  protected us.ullberg.startpunkt.objects.ApplicationResponse mapToApplicationSpecWithMetadata(
      GenericKubernetesResource item) {
    ApplicationSpec spec = mapToApplicationSpec(item);
    us.ullberg.startpunkt.objects.ApplicationResponse withMetadata =
        new us.ullberg.startpunkt.objects.ApplicationResponse(spec);

    // Populate metadata fields
    withMetadata.setNamespace(getResourceNamespace(item));
    withMetadata.setResourceName(getResourceMetadataName(item));
    withMetadata.setHasOwnerReferences(hasOwnerReferences(item));

    return withMetadata;
  }

  /**
   * Maps a GenericKubernetesResource to an ApplicationSpec instance.
   *
   * @param item the Kubernetes generic resource
   * @return the ApplicationSpec mapped from the resource
   */
  protected ApplicationSpec mapToApplicationSpec(GenericKubernetesResource item) {
    ApplicationSpec spec =
        new ApplicationSpec(
            getAppName(item),
            getAppGroup(item),
            getAppIcon(item),
            getAppIconColor(item),
            getAppUrl(item),
            getAppInfo(item),
            getAppTargetBlank(item),
            getAppLocation(item),
            getAppEnabled(item),
            getAppRootPath(item),
            getAppTags(item));

    // Note: Metadata fields (namespace, resourceName, hasOwnerReferences) are set
    // by ApplicationResource when wrapping in ApplicationResponse
    return spec;
  }

  /**
   * Checks whether a Kubernetes resource has owner references or is managed by ArgoCD.
   *
   * @param item the Kubernetes generic resource
   * @return true if the resource has owner references or is managed by ArgoCD, false otherwise
   */
  protected boolean hasOwnerReferences(GenericKubernetesResource item) {
    if (item.getMetadata() == null) {
      return false;
    }

    // Check for owner references
    var ownerRefs = item.getMetadata().getOwnerReferences();
    if (ownerRefs != null && !ownerRefs.isEmpty()) {
      return true;
    }

    // Check for ArgoCD management in managed fields
    var managedFields = item.getMetadata().getManagedFields();
    if (managedFields != null && !managedFields.isEmpty()) {
      return managedFields.stream()
          .anyMatch(
              field -> {
                var manager = field.getManager();
                return manager != null && manager.contains("argocd");
              });
    }

    return false;
  }

  /**
   * Gets the namespace of a Kubernetes resource.
   *
   * @param item the Kubernetes generic resource
   * @return the namespace, or null if metadata is not present
   */
  protected String getResourceNamespace(GenericKubernetesResource item) {
    if (item.getMetadata() == null) {
      return null;
    }
    return item.getMetadata().getNamespace();
  }

  /**
   * Gets the metadata name of a Kubernetes resource.
   *
   * @param item the Kubernetes generic resource
   * @return the resource name (metadata.name), or null if metadata is not present
   */
  protected String getResourceMetadataName(GenericKubernetesResource item) {
    if (item.getMetadata() == null) {
      return null;
    }
    return item.getMetadata().getName();
  }

  /**
   * Returns the annotations map from the Kubernetes resource metadata.
   *
   * @param item the Kubernetes generic resource
   * @return map of annotations or null if none present
   */
  protected Map<String, String> getAnnotations(GenericKubernetesResource item) {
    if (item.getMetadata() == null) {
      return null;
    }
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
   * Returns the tags of the application. By default, reads from the "startpunkt.ullberg.us/tags"
   * annotation.
   *
   * @param item the Kubernetes generic resource
   * @return comma-separated tags string or null if not set
   */
  protected String getAppTags(GenericKubernetesResource item) {
    var annotations = getAnnotations(item);
    if (annotations != null && annotations.containsKey("startpunkt.ullberg.us/tags")) {
      return annotations.get("startpunkt.ullberg.us/tags");
    }
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

  /**
   * Retrieves the application root path from resource annotations.
   *
   * @param item Kubernetes resource
   * @return root path string or null if not found
   */
  protected String getAppRootPath(GenericKubernetesResource item) {
    var annotations = getAnnotations(item);
    if (annotations != null && annotations.containsKey("startpunkt.ullberg.us/rootPath")) {
      return annotations.get("startpunkt.ullberg.us/rootPath");
    }
    return null;
  }

  /**
   * Appends the root path to the URL if a rootPath annotation is present.
   *
   * @param url base URL
   * @param item Kubernetes resource to get rootPath from
   * @return URL with rootPath appended or original URL if no rootPath
   */
  protected String appendRootPath(String url, GenericKubernetesResource item) {
    if (url == null) {
      return null;
    }

    String rootPath = getAppRootPath(item);
    if (rootPath != null && !rootPath.isEmpty()) {
      return appendRootPath(url, rootPath);
    }
    return url;
  }

  /**
   * Appends the root path to the URL.
   *
   * @param url base URL
   * @param rootPath root path to append
   * @return URL with rootPath appended
   */
  protected String appendRootPath(String url, String rootPath) {
    if (url == null) {
      return null;
    }

    if (rootPath != null && !rootPath.isEmpty()) {
      // Ensure the URL doesn't end with a slash and rootPath starts with a slash
      String normalizedUrl = url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
      String normalizedRootPath = rootPath.startsWith("/") ? rootPath : "/" + rootPath;
      return normalizedUrl + normalizedRootPath;
    }
    return url;
  }
}
