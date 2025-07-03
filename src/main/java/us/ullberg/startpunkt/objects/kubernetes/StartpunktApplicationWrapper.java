package us.ullberg.startpunkt.objects.kubernetes;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;

// Class representing a wrapper for Startpunkt application objects
public class StartpunktApplicationWrapper extends BaseKubernetesObject {

  // Constructor to initialize the StartpunktApplicationWrapper with specific group, version, and
  // plural kind
  public StartpunktApplicationWrapper() {
    super("startpunkt.ullberg.us", "v1alpha1", "applications");
  }

  // Override getAppName since the spec has a required property called name
  @Override
  protected String getAppName(GenericKubernetesResource item) {
    return getSpec(item).get("name").toString().toLowerCase();
  }

  // Override getAppGroup since the spec has an optional property called group
  // If the group is not set, return the super.getAppGroup response
  @Override
  protected String getAppGroup(GenericKubernetesResource item) {
    return getOptionalSpecString(item, "group", super.getAppGroup(item)).toLowerCase();
  }

  // Override getAppUrl since the spec has a required property called url
  @Override
  protected String getAppUrl(GenericKubernetesResource item) {
    return getSpec(item).get("url").toString();
  }

  // Override getAppIcon since the spec has an optional property called icon
  // If the icon is not set, return the super.getAppIcon response
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

  // Override getAppInfo since the spec has an optional property called info
  // If the info is not set, return the super.getAppInfo response
  @Override
  protected String getAppInfo(GenericKubernetesResource item) {
    return getOptionalSpecString(item, "info", super.getAppInfo(item));
  }

  // Override getAppTargetBlank since the spec has an optional property called targetBlank
  // If the targetBlank is not set, return the super.getAppTargetBlank response
  @Override
  protected Boolean getAppTargetBlank(GenericKubernetesResource item) {
    return getOptionalSpecBoolean(item, "targetBlank", super.getAppTargetBlank(item));
  }

  // Override getAppLocation since the spec has an optional property called location
  // If the location is not set, return the super.getAppLocation response
  @Override
  protected int getAppLocation(GenericKubernetesResource item) {
    int location = getOptionalSpecInteger(item, "location", super.getAppLocation(item));
    return location == 0 ? 1000 : location;
  }

  // Override getAppEnabled since the spec has an optional property called enabled
  // If the enabled is not set, return the super.getAppEnabled response
  @Override
  protected Boolean getAppEnabled(GenericKubernetesResource item) {
    return getOptionalSpecBoolean(item, "enabled", super.getAppEnabled(item));
  }
}
