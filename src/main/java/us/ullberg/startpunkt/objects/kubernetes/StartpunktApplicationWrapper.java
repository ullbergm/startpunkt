package us.ullberg.startpunkt.objects.kubernetes;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;

/**
 * Wrapper for Startpunkt application Kubernetes custom resources. This class extracts
 * application-specific information from the resource's spec with fallbacks to defaults from the
 * base class.
 */
public class StartpunktApplicationWrapper extends BaseKubernetesObject {

  /**
   * Constructs a StartpunktApplicationWrapper with group "startpunkt.ullberg.us", version
   * "v1alpha2", and plural "applications".
   */
  public StartpunktApplicationWrapper() {
    super("startpunkt.ullberg.us", "v1alpha2", "applications");
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
    String baseUrl = getSpec(item).get("url").toString();
    String rootPath = getOptionalSpecString(item, "rootPath", null);

    if (rootPath != null && !rootPath.trim().isEmpty()) {
      return appendRootPath(baseUrl, rootPath);
    }

    // Fall back to annotation-based rootPath for backward compatibility
    return appendRootPath(baseUrl, item);
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
}
