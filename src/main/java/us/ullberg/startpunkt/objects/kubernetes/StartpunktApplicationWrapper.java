package us.ullberg.startpunkt.objects.kubernetes;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.dsl.base.ResourceDefinitionContext;
import io.quarkus.logging.Log;
import java.util.List;
import java.util.Map;
import us.ullberg.startpunkt.crd.v1alpha3.ApplicationSpec;

/**
 * Wrapper for Startpunkt application Kubernetes custom resources. This class extracts
 * application-specific information from the resource's spec with fallbacks to defaults from the
 * base class.
 */
public class StartpunktApplicationWrapper extends BaseKubernetesObject {

  /**
   * Constructs a StartpunktApplicationWrapper with group "startpunkt.ullberg.us", version
   * "v1alpha3", and plural "applications".
   */
  public StartpunktApplicationWrapper() {
    super("startpunkt.ullberg.us", "v1alpha3", "applications");
  }

  /**
   * Retrieves application specifications with support for urlFrom references.
   *
   * @param client the Kubernetes client instance
   * @param anyNamespace whether to search across all namespaces
   * @param matchNames list of namespaces to filter on if anyNamespace is false
   * @return list of ApplicationSpec instances
   */
  @Override
  public List<ApplicationSpec> getApplicationSpecs(
      KubernetesClient client, boolean anyNamespace, List<String> matchNames) {
    return getGenericKubernetesResources(client, anyNamespace, matchNames).getItems().stream()
        .map(item -> mapToApplicationSpec(item, client))
        .toList();
  }

  /**
   * Maps a GenericKubernetesResource to an ApplicationSpec instance with client support for urlFrom
   * resolution.
   *
   * @param item the Kubernetes generic resource
   * @param client the Kubernetes client instance
   * @return the ApplicationSpec mapped from the resource
   */
  protected ApplicationSpec mapToApplicationSpec(
      GenericKubernetesResource item, KubernetesClient client) {
    return new ApplicationSpec(
        getAppName(item),
        getAppGroup(item),
        getAppIcon(item),
        getAppIconColor(item),
        getAppUrl(item, client),
        getAppInfo(item),
        getAppTargetBlank(item),
        getAppLocation(item),
        getAppEnabled(item),
        getAppRootPath(item),
        getAppTags(item));
  }

  /**
   * Retrieves the application name from the resource spec. This property is required.
   *
   * @param item Kubernetes resource
   * @return application name in lowercase
   */
  @Override
  protected String getAppName(GenericKubernetesResource item) {
    return getSpec(item).get("name").toString().toLowerCase();
  }

  /**
   * Retrieves the application group from the resource spec. Returns base class group if not
   * present.
   *
   * @param item Kubernetes resource
   * @return application group in lowercase
   */
  @Override
  protected String getAppGroup(GenericKubernetesResource item) {
    return getOptionalSpecString(item, "group", super.getAppGroup(item)).toLowerCase();
  }

  /**
   * Retrieves the application rootPath from the resource spec. Returns base class rootPath if not
   * present.
   *
   * @param item Kubernetes resource
   * @return application rootPath
   */
  @Override
  protected String getAppRootPath(GenericKubernetesResource item) {
    return getOptionalSpecString(item, "rootPath", super.getAppRootPath(item));
  }

  /**
   * Retrieves the application URL from the resource spec with rootPath appended if specified.
   *
   * @param item Kubernetes resource
   * @return URL string with rootPath appended if specified
   */
  @Override
  protected String getAppUrl(GenericKubernetesResource item) {
    // This method is kept for backwards compatibility but won't be used in normal flow
    String baseUrl = getOptionalSpecString(item, "url", null);
    if (baseUrl == null) {
      return null;
    }
    String rootPath = getOptionalSpecString(item, "rootPath", null);

    if (rootPath != null && !rootPath.trim().isEmpty()) {
      return appendRootPath(baseUrl, rootPath);
    }

    // Fall back to annotation-based rootPath for backward compatibility
    return appendRootPath(baseUrl, item);
  }

  /**
   * Retrieves the application URL from the resource spec with support for urlFrom references. If
   * urlFrom is specified, reads the URL from the referenced Kubernetes object. Otherwise, falls
   * back to the direct url field.
   *
   * @param item Kubernetes resource
   * @param client Kubernetes client for resolving urlFrom references
   * @return URL string with rootPath appended if specified
   */
  protected String getAppUrl(GenericKubernetesResource item, KubernetesClient client) {
    var spec = getSpec(item);

    // Check if urlFrom is specified
    if (spec.containsKey("urlFrom") && spec.get("urlFrom") != null) {
      String resolvedUrl = resolveUrlFromReference(item, client);
      if (resolvedUrl != null) {
        String rootPath = getOptionalSpecString(item, "rootPath", null);
        if (rootPath != null && !rootPath.trim().isEmpty()) {
          return appendRootPath(resolvedUrl, rootPath);
        }
        return appendRootPath(resolvedUrl, item);
      }
    }

    // Fall back to direct url field
    return getAppUrl(item);
  }

  /**
   * Resolves the URL from a urlFrom reference by fetching the referenced Kubernetes object and
   * extracting the specified property.
   *
   * @param item the Application resource containing the urlFrom reference
   * @param client Kubernetes client for fetching the referenced object
   * @return resolved URL or null if resolution fails
   */
  @SuppressWarnings("unchecked")
  private String resolveUrlFromReference(GenericKubernetesResource item, KubernetesClient client) {
    var spec = getSpec(item);
    Map<String, Object> urlFromMap = (Map<String, Object>) spec.get("urlFrom");

    if (urlFromMap == null) {
      return null;
    }

    try {
      String apiVersion = (String) urlFromMap.get("apiVersion");
      String kind = (String) urlFromMap.get("kind");
      String name = (String) urlFromMap.get("name");
      String namespace = (String) urlFromMap.get("namespace");
      String property = (String) urlFromMap.get("property");
      String apiGroup = (String) urlFromMap.get("apiGroup");

      if (apiVersion == null || kind == null || name == null || property == null) {
        Log.warn("urlFrom is missing required fields (apiVersion, kind, name, or property)");
        return null;
      }

      // Default namespace to the same namespace as the Application
      if (namespace == null || namespace.isEmpty()) {
        namespace = item.getMetadata().getNamespace();
      }

      // Determine the group from apiVersion (e.g., "v1" -> "", "apps/v1" -> "apps")
      String group = "";
      if (apiGroup != null && !apiGroup.isEmpty()) {
        group = apiGroup;
      } else if (apiVersion.contains("/")) {
        group = apiVersion.substring(0, apiVersion.indexOf("/"));
        apiVersion = apiVersion.substring(apiVersion.indexOf("/") + 1);
      }

      // Build ResourceDefinitionContext for the referenced resource
      ResourceDefinitionContext context =
          new ResourceDefinitionContext.Builder()
              .withGroup(group)
              .withVersion(apiVersion)
              .withPlural(kind.toLowerCase() + "s") // Simple pluralization
              .withNamespaced(true)
              .build();

      // Fetch the referenced resource
      GenericKubernetesResource referencedResource =
          client.genericKubernetesResources(context).inNamespace(namespace).withName(name).get();

      if (referencedResource == null) {
        Log.warn(
            String.format(
                "Referenced resource not found: %s/%s in namespace %s", kind, name, namespace));
        return null;
      }

      // Extract the property value using the property path
      return extractProperty(referencedResource, property);

    } catch (Exception e) {
      Log.error("Error resolving urlFrom reference", e);
      return null;
    }
  }

  /**
   * Extracts a property value from a Kubernetes resource using a JSON path. Supports simple paths
   * like "spec.host", "data.url", "status.loadBalancer.ingress[0].hostname".
   *
   * @param resource the Kubernetes resource
   * @param propertyPath the property path (dot-separated)
   * @return the property value as a string, or null if not found
   */
  @SuppressWarnings("unchecked")
  private String extractProperty(GenericKubernetesResource resource, String propertyPath) {
    if (propertyPath == null || propertyPath.isEmpty()) {
      return null;
    }

    Map<String, Object> current = resource.getAdditionalProperties();
    String[] parts = propertyPath.split("\\.");

    for (int i = 0; i < parts.length; i++) {
      String part = parts[i];

      // Handle array indexing (e.g., "ingress[0]")
      if (part.contains("[") && part.contains("]")) {
        String arrayName = part.substring(0, part.indexOf("["));
        int index = Integer.parseInt(part.substring(part.indexOf("[") + 1, part.indexOf("]")));

        Object arrayObj = current.get(arrayName);
        if (arrayObj instanceof List) {
          List<Object> list = (List<Object>) arrayObj;
          if (index >= 0 && index < list.size()) {
            Object item = list.get(index);
            if (i == parts.length - 1) {
              return item != null ? item.toString() : null;
            }
            if (item instanceof Map) {
              current = (Map<String, Object>) item;
              continue;
            }
          }
        }
        return null;
      }

      Object value = current.get(part);
      if (value == null) {
        return null;
      }

      // If this is the last part, return the value
      if (i == parts.length - 1) {
        return value.toString();
      }

      // Otherwise, continue navigating if it's a map
      if (value instanceof Map) {
        current = (Map<String, Object>) value;
      } else {
        return null;
      }
    }

    return null;
  }

  /**
   * Retrieves the application icon color from the resource spec. Returns base class icon color if
   * not present.
   *
   * @param item Kubernetes resource
   * @return icon color string or fallback value
   */
  @Override
  protected String getAppIcon(GenericKubernetesResource item) {
    return getOptionalSpecString(item, "icon", super.getAppIcon(item));
  }

  // Override getAppIconColor since the spec has an optional property called iconColor
  // If the iconColor is not set, return the super.getAppIconColor response
  @Override
  protected String getAppIconColor(GenericKubernetesResource item) {
    return getOptionalSpecString(item, "iconColor", super.getAppIconColor(item));
  }

  /**
   * Retrieves additional information (info) from the resource spec. Returns base class info if not
   * present.
   *
   * @param item Kubernetes resource
   * @return info string or fallback value
   */
  @Override
  protected String getAppInfo(GenericKubernetesResource item) {
    return getOptionalSpecString(item, "info", super.getAppInfo(item));
  }

  /**
   * Retrieves the targetBlank flag from the resource spec. Returns base class targetBlank if not
   * present.
   *
   * @param item Kubernetes resource
   * @return Boolean indicating if the link should open in a new tab
   */
  @Override
  protected Boolean getAppTargetBlank(GenericKubernetesResource item) {
    return getOptionalSpecBoolean(item, "targetBlank", super.getAppTargetBlank(item));
  }

  /**
   * Retrieves the location (sorting order) from the resource spec. If location is zero, returns
   * 1000 for backwards compatibility. Returns base class location if not present.
   *
   * @param item Kubernetes resource
   * @return integer location value
   */
  @Override
  protected int getAppLocation(GenericKubernetesResource item) {
    int location = getOptionalSpecInteger(item, "location", super.getAppLocation(item));
    return location == 0 ? 1000 : location;
  }

  /**
   * Retrieves the enabled flag from the resource spec. Returns base class enabled if not present.
   *
   * @param item Kubernetes resource
   * @return Boolean indicating if the application is enabled
   */
  @Override
  protected Boolean getAppEnabled(GenericKubernetesResource item) {
    return getOptionalSpecBoolean(item, "enabled", super.getAppEnabled(item));
  }

  /**
   * Retrieves the tags from the resource spec. Returns base class tags if not present.
   *
   * @param item Kubernetes resource
   * @return comma-separated tags string
   */
  @Override
  protected String getAppTags(GenericKubernetesResource item) {
    return getOptionalSpecString(item, "tags", super.getAppTags(item));
  }
}
