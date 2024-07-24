package us.ullberg.startpunkt.objects.kubernetes;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;

// Abstract class representing a Kubernetes object with annotations
public abstract class AnnotatedKubernetesObject extends BaseKubernetesObject {

  // Constructor to initialize the custom resource with specified values
  protected AnnotatedKubernetesObject(String group, String version, String pluralKind) {
    super(group, version, pluralKind);
  }

  // Override the method to get the application name from annotations
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

    // If no annotation matches, return the super class' getAppName method
    return super.getAppName(item);
  }

  // Override the method to get the application group from annotations
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

    // If no annotation matches, return the super class' getAppGroup method
    return super.getAppGroup(item);
  }

  // Override the method to get the application URL from annotations
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

    // If no annotation matches, return the super class' getAppUrl method
    return super.getAppUrl(item);
  }

  // Override the method to get the application icon from annotations
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

    // If no annotation matches, return the super class' getAppIcon method
    return super.getAppIcon(item);
  }

  // Override the method to get the application icon color from annotations
  @Override
  protected String getAppIconColor(GenericKubernetesResource item) {
    var annotations = getAnnotations(item);

    String[] annotationKeys = {"startpunkt.ullberg.us/iconColor", "hajimari.io/iconColor"};
    for (String key : annotationKeys) {
      if (annotations.containsKey(key)) {
        return annotations.get(key).toLowerCase();
      }
    }

    // If no annotation matches, return the super class' getAppIconColor method
    return super.getAppIconColor(item);
  }

  // Override the method to get the application info from annotations
  @Override
  protected String getAppInfo(GenericKubernetesResource item) {
    var annotations = getAnnotations(item);

    String[] annotationKeys = {"startpunkt.ullberg.us/info", "hajimari.io/info"};
    for (String key : annotationKeys) {
      if (annotations.containsKey(key)) {
        return annotations.get(key).toLowerCase();
      }
    }

    // If no annotation matches, return the super class' getAppInfo method
    return super.getAppInfo(item);
  }

  // Override the method to check if the application URL should open in a new tab
  @Override
  protected Boolean getAppTargetBlank(GenericKubernetesResource item) {
    var annotations = getAnnotations(item);

    String[] annotationKeys = {"startpunkt.ullberg.us/targetBlank", "hajimari.io/targetBlank"};
    for (String key : annotationKeys) {
      if (annotations.containsKey(key)) {
        return Boolean.parseBoolean(annotations.get(key));
      }
    }

    // If no annotation matches, return the super class' getAppTargetBlank method
    return super.getAppTargetBlank(item);
  }

  // Override the method to get the application location from annotations
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

  // Override the method to check if the application is enabled from annotations
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

    // If no annotation matches, return the super class' getAppEnabled method
    return super.getAppEnabled(item);
  }

  // Override the method to get the application protocol from annotations
  @Override
  protected String getAppProtocol(GenericKubernetesResource item) {
    var annotations = getAnnotations(item);

    String[] annotationKeys = {"startpunkt.ullberg.us/protocol"};
    for (String key : annotationKeys) {
      if (annotations.containsKey(key)) {
        return annotations.get(key);
      }
    }

    // If no annotation matches, return the super class' getAppProtocol method
    return super.getAppProtocol(item);
  }
}
