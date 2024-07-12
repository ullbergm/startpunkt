package us.ullberg.startpunkt.objects;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;

public abstract class AnnotatedKubernetesObject extends BaseKubernetesObject {
  public AnnotatedKubernetesObject(String group, String version, String pluralKind) {
    super(group, version, pluralKind);
  }

  @Override
  protected String getAppName(GenericKubernetesResource item) {
    var annotations = getAnnotations(item);

    String[] annotationKeys =
        {"startpunkt.ullberg.us/appName", "hajimari.io/appName", "forecastle.stakater.com/appName"};
    for (String key : annotationKeys) {
      if (annotations.containsKey(key)) {
        return annotations.get(key).toLowerCase();
      }
    }

    // If not, return the super class' getAppName method
    return super.getAppName(item);
  }

  @Override
  protected String getAppGroup(GenericKubernetesResource item) {
    var annotations = getAnnotations(item);

    String[] annotationKeys =
        {"startpunkt.ullberg.us/group", "hajimari.io/group", "forecastle.stakater.com/group"};
    for (String key : annotationKeys) {
      if (annotations.containsKey(key)) {
        return annotations.get(key).toLowerCase();
      }
    }

    // If not, return the super class' getAppGroup method
    return super.getAppGroup(item);
  }

  @Override
  protected String getAppUrl(GenericKubernetesResource item) {
    var annotations = getAnnotations(item);

    String[] annotationKeys =
        {"startpunkt.ullberg.us/url", "hajimari.io/url", "forecastle.stakater.com/url"};
    for (String key : annotationKeys) {
      if (annotations.containsKey(key)) {
        return annotations.get(key).toLowerCase();
      }
    }

    // If not, return the super class' getAppUrl method
    return super.getAppUrl(item);
  }

  @Override
  protected String getAppIcon(GenericKubernetesResource item) {
    var annotations = getAnnotations(item);

    String[] annotationKeys =
        {"startpunkt.ullberg.us/icon", "hajimari.io/icon", "forecastle.stakater.com/icon"};
    for (String key : annotationKeys) {
      if (annotations.containsKey(key)) {
        return annotations.get(key).toLowerCase();
      }
    }

    // If not, return the super class' getAppIcon method
    return super.getAppIcon(item);
  }

  @Override
  protected String getAppIconColor(GenericKubernetesResource item) {
    var annotations = getAnnotations(item);

    String[] annotationKeys = {"startpunkt.ullberg.us/iconColor", "hajimari.io/iconColor"};
    for (String key : annotationKeys) {
      if (annotations.containsKey(key)) {
        return annotations.get(key).toLowerCase();
      }
    }

    // If not, return the super class' getAppIconColor method
    return super.getAppIconColor(item);
  }

  @Override
  protected String getAppInfo(GenericKubernetesResource item) {
    var annotations = getAnnotations(item);

    String[] annotationKeys = {"startpunkt.ullberg.us/info", "hajimari.io/info"};
    for (String key : annotationKeys) {
      if (annotations.containsKey(key)) {
        return annotations.get(key).toLowerCase();
      }
    }

    // If not, return the super class' getAppInfo method
    return super.getAppInfo(item);
  }

  @Override
  protected Boolean getAppTargetBlank(GenericKubernetesResource item) {
    var annotations = getAnnotations(item);

    String[] annotationKeys = {"startpunkt.ullberg.us/targetBlank", "hajimari.io/targetBlank"};
    for (String key : annotationKeys) {
      if (annotations.containsKey(key)) {
        return Boolean.parseBoolean(annotations.get(key));
      }
    }

    // If not, return the super class' getAppTargetBlank method
    return super.getAppTargetBlank(item);
  }

  @Override
  protected int getAppLocation(GenericKubernetesResource item) {
    var annotations = getAnnotations(item);

    String[] annotationKeys = {"startpunkt.ullberg.us/location", "hajimari.io/location"};

    // Get the default value from the super class' getAppLocation method
    var location = super.getAppLocation(item);

    for (String key : annotationKeys) {
      if (annotations.containsKey(key)) {
        location = Integer.parseInt(annotations.get(key));
        break;
      }
    }

    // This is for backwards compatibility with Hajimari, 0 is the same as blank
    if (location == 0) {
      return 1000;
    }

    return location;
  }

  @Override
  protected Boolean getAppEnabled(GenericKubernetesResource item) {
    var annotations = getAnnotations(item);

    String[] annotationKeys =
        {"startpunkt.ullberg.us/enable", "hajimari.io/enable", "forecastle.stakater.com/expose"};
    for (String key : annotationKeys) {
      if (annotations.containsKey(key)) {
        return Boolean.parseBoolean(annotations.get(key));
      }
    }

    // If not, return the super class' getAppEnable method
    return super.getAppEnabled(item);
  }
}
