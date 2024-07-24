package us.ullberg.startpunkt.objects.kubernetes;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;

// Class representing a wrapper for Hajimari applications
public class HajimariApplicationWrapper extends BaseKubernetesObject {

  // Constructor to initialize the custom resource with specific group, version, and plural kind
  public HajimariApplicationWrapper() {
    super("hajimari.io", "v1alpha1", "applications");
  }

  // Override getAppName since the spec has a required property called name
  @Override
  protected String getAppName(GenericKubernetesResource item) {
    return getSpec(item).get("name").toString().toLowerCase();
  }

  // Override getAppGroup since the spec has a required property called group
  @Override
  protected String getAppGroup(GenericKubernetesResource item) {
    var spec = getSpec(item);
    return spec.get("group").toString().toLowerCase();
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
    var spec = getSpec(item);

    if (spec.containsKey("icon"))
      return spec.get("icon").toString();

    return super.getAppIcon(item);
  }

  // Override getAppInfo since the spec has an optional property called info
  // If the info is not set, return the super.getAppInfo response
  @Override
  protected String getAppInfo(GenericKubernetesResource item) {
    var spec = getSpec(item);

    if (spec.containsKey("info"))
      return spec.get("info").toString();

    return super.getAppInfo(item);
  }

  // Override getAppTargetBlank since the spec has an optional property called targetBlank
  // If the targetBlank is not set, return the super.getAppTargetBlank response
  @Override
  protected Boolean getAppTargetBlank(GenericKubernetesResource item) {
    var spec = getSpec(item);

    if (spec.containsKey("targetBlank"))
      return Boolean.parseBoolean(spec.get("targetBlank").toString());

    return super.getAppTargetBlank(item);
  }

  // Override getAppLocation since the spec has an optional property called location
  // If the location is not set, return the super.getAppLocation response
  @Override
  protected int getAppLocation(GenericKubernetesResource item) {
    var spec = getSpec(item);

    if (spec.containsKey("location")) {
      var location = Integer.parseInt(spec.get("location").toString());

      // Backwards compatibility for location 0
      if (location == 0)
        return 1000;

      return location;
    }

    return super.getAppLocation(item);
  }
}
