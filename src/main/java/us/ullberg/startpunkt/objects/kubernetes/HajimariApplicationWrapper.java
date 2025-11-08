package us.ullberg.startpunkt.objects.kubernetes;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;

/**
 * Wrapper for Hajimari application custom resources. Provides access to application properties from
 * the Kubernetes resource spec.
 */
public class HajimariApplicationWrapper extends BaseKubernetesObject {

  /**
   * Constructs a wrapper for Hajimari application custom resources. Uses group "hajimari.io",
   * version "v1alpha1", and plural "applications".
   */
  public HajimariApplicationWrapper() {
    super("hajimari.io", "v1alpha1", "applications");
  }

  /**
   * Gets the application name from the resource spec.
   *
   * @param item the Kubernetes resource
   * @return application name in lowercase
   */
  @Override
  protected String getAppName(GenericKubernetesResource item) {
    return getSpec(item).get("name").toString().toLowerCase();
  }

  /**
   * Gets the application group from the resource spec.
   *
   * @param item the Kubernetes resource
   * @return application group in lowercase
   */
  @Override
  protected String getAppGroup(GenericKubernetesResource item) {
    return getSpec(item).get("group").toString().toLowerCase();
  }

  /**
   * Gets the application URL from the resource spec.
   *
   * @param item the Kubernetes resource
   * @return application URL as string
   */
  @Override
  protected String getAppUrl(GenericKubernetesResource item) {
    String baseUrl = getSpec(item).get("url").toString();
    return appendRootPath(baseUrl, item);
  }

  /**
   * Gets the application icon from the resource spec. Falls back to parent implementation if not
   * set.
   *
   * @param item the Kubernetes resource
   * @return icon URL or default value from super
   */
  @Override
  protected String getAppIcon(GenericKubernetesResource item) {
    return getOptionalSpecString(item, "icon", super.getAppIcon(item));
  }

  /**
   * Gets the application enabled status from the resource spec. Defaults to true if not specified
   * in the spec.
   *
   * @param item the Kubernetes resource
   * @return true if app is enabled (defaults to true)
   */
  @Override
  protected Boolean getAppEnabled(GenericKubernetesResource item) {
    return getOptionalSpecBoolean(item, "enabled", true);
  }

  /**
   * Gets additional application info from the resource spec. Falls back to parent implementation if
   * not set.
   *
   * @param item the Kubernetes resource
   * @return info text or default from super
   */
  @Override
  protected String getAppInfo(GenericKubernetesResource item) {
    return getOptionalSpecString(item, "info", super.getAppInfo(item));
  }

  /**
   * Gets whether the application should open in a new tab from the resource spec. Falls back to
   * parent implementation if not set.
   *
   * @param item the Kubernetes resource
   * @return true if targetBlank is set, otherwise value from super
   */
  @Override
  protected Boolean getAppTargetBlank(GenericKubernetesResource item) {
    return getOptionalSpecBoolean(item, "targetBlank", super.getAppTargetBlank(item));
  }

  /**
   * Gets the application location ordering value from the resource spec. Falls back to super if not
   * set. If 0 is returned, substitutes 1000.
   *
   * @param item the Kubernetes resource
   * @return location value for sorting
   */
  @Override
  protected int getAppLocation(GenericKubernetesResource item) {
    int location = getOptionalSpecInteger(item, "location", super.getAppLocation(item));
    return location == 0 ? 1000 : location;
  }
}
