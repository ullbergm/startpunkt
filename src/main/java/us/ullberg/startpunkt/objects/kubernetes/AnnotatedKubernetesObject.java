package us.ullberg.startpunkt.objects.kubernetes;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import java.util.List;
import us.ullberg.startpunkt.crd.ApplicationSpec;

/**
 * Abstract base class for Kubernetes objects that extract application properties from annotations.
 * Extends {@link BaseKubernetesObject} and overrides methods to get app info from Kubernetes
 * resource annotations.
 */
public abstract class AnnotatedKubernetesObject extends BaseKubernetesObject {

  /**
   * Constructs an AnnotatedKubernetesObject with the given group, version, and plural kind.
   *
   * @param group API group of the Kubernetes resource
   * @param version API version of the Kubernetes resource
   * @param pluralKind plural kind name of the Kubernetes resource
   */
  protected AnnotatedKubernetesObject(String group, String version, String pluralKind) {
    super(group, version, pluralKind);
  }

  /**
   * Retrieves the application name from resource annotations or falls back to metadata name.
   *
   * @param item Kubernetes resource
   * @return application name in lowercase
   */
  @Override
  protected String getAppName(GenericKubernetesResource item) {
    var annotations = getAnnotations(item);

    String[] annotationKeys = {
      "startpunkt.ullberg.us/appName", "hajimari.io/appName", "forecastle.stakater.com/appName"
    };
    for (String key : annotationKeys) {
      if (annotations.containsKey(key)) {
        return annotations.get(key).toLowerCase();
      }
    }
    return super.getAppName(item);
  }

  /**
   * Retrieves the application group from resource annotations or falls back to metadata namespace.
   *
   * @param item Kubernetes resource
   * @return application group in lowercase
   */
  @Override
  protected String getAppGroup(GenericKubernetesResource item) {
    var annotations = getAnnotations(item);

    String[] annotationKeys = {
      "startpunkt.ullberg.us/group", "hajimari.io/group", "forecastle.stakater.com/group"
    };
    for (String key : annotationKeys) {
      if (annotations.containsKey(key)) {
        return annotations.get(key).toLowerCase();
      }
    }
    return super.getAppGroup(item);
  }

  /**
   * Retrieves the application URL from resource annotations or falls back to spec URL.
   *
   * @param item Kubernetes resource
   * @return application URL or null if not found
   */
  @Override
  protected String getAppUrl(GenericKubernetesResource item) {
    var annotations = getAnnotations(item);

    String[] annotationKeys = {
      "startpunkt.ullberg.us/url", "hajimari.io/url", "forecastle.stakater.com/url"
    };
    for (String key : annotationKeys) {
      if (annotations.containsKey(key)) {
        return annotations.get(key).toLowerCase();
      }
    }
    return super.getAppUrl(item);
  }

  /**
   * Retrieves the application icon from resource annotations or falls back to spec icon.
   *
   * @param item Kubernetes resource
   * @return application icon or null if not found
   */
  @Override
  protected String getAppIcon(GenericKubernetesResource item) {
    var annotations = getAnnotations(item);

    String[] annotationKeys = {
      "startpunkt.ullberg.us/icon", "hajimari.io/icon", "forecastle.stakater.com/icon"
    };
    for (String key : annotationKeys) {
      if (annotations.containsKey(key)) {
        return annotations.get(key).toLowerCase();
      }
    }
    return super.getAppIcon(item);
  }

  /**
   * Retrieves the application icon color from resource annotations or falls back to spec iconColor.
   *
   * @param item Kubernetes resource
   * @return application icon color or null if not found
   */
  @Override
  protected String getAppIconColor(GenericKubernetesResource item) {
    var annotations = getAnnotations(item);

    String[] annotationKeys = {"startpunkt.ullberg.us/iconColor", "hajimari.io/iconColor"};
    for (String key : annotationKeys) {
      if (annotations.containsKey(key)) {
        return annotations.get(key).toLowerCase();
      }
    }
    return super.getAppIconColor(item);
  }

  /**
   * Retrieves the application info from resource annotations or falls back to spec info.
   *
   * @param item Kubernetes resource
   * @return application info or null if not found
   */
  @Override
  protected String getAppInfo(GenericKubernetesResource item) {
    var annotations = getAnnotations(item);

    String[] annotationKeys = {"startpunkt.ullberg.us/info", "hajimari.io/info"};
    for (String key : annotationKeys) {
      if (annotations.containsKey(key)) {
        return annotations.get(key).toLowerCase();
      }
    }
    return super.getAppInfo(item);
  }

  /**
   * Determines if the application URL should open in a new tab based on annotations or spec.
   *
   * @param item Kubernetes resource
   * @return Boolean indicating targetBlank or false if not set
   */
  @Override
  protected Boolean getAppTargetBlank(GenericKubernetesResource item) {
    var annotations = getAnnotations(item);

    String[] annotationKeys = {"startpunkt.ullberg.us/targetBlank", "hajimari.io/targetBlank"};
    for (String key : annotationKeys) {
      if (annotations.containsKey(key)) {
        return Boolean.parseBoolean(annotations.get(key));
      }
    }
    return super.getAppTargetBlank(item);
  }

  /**
   * Retrieves the application location (sort order) from annotations or spec. Treats 0 as 1000 for
   * backwards compatibility.
   *
   * @param item Kubernetes resource
   * @return location integer
   */
  @Override
  protected int getAppLocation(GenericKubernetesResource item) {
    var annotations = getAnnotations(item);

    String[] annotationKeys = {"startpunkt.ullberg.us/location", "hajimari.io/location"};
    int location = super.getAppLocation(item);

    for (String key : annotationKeys) {
      if (annotations.containsKey(key)) {
        location = Integer.parseInt(annotations.get(key));
        break;
      }
    }
    if (location == 0) {
      return 1000;
    }
    return location;
  }

  /**
   * Determines if the application is enabled based on annotations or spec.
   *
   * @param item Kubernetes resource
   * @return Boolean indicating enabled status or false if not set
   */
  @Override
  protected Boolean getAppEnabled(GenericKubernetesResource item) {
    var annotations = getAnnotations(item);

    String[] annotationKeys = {
      "startpunkt.ullberg.us/enable", "hajimari.io/enable", "forecastle.stakater.com/expose"
    };
    for (String key : annotationKeys) {
      if (annotations.containsKey(key)) {
        return Boolean.parseBoolean(annotations.get(key));
      }
    }
    return super.getAppEnabled(item);
  }

  /**
   * Retrieves the application protocol from annotations or spec.
   *
   * @param item Kubernetes resource
   * @return protocol string or null if not set
   */
  @Override
  protected String getAppProtocol(GenericKubernetesResource item) {
    var annotations = getAnnotations(item);

    String[] annotationKeys = {"startpunkt.ullberg.us/protocol"};
    for (String key : annotationKeys) {
      if (annotations.containsKey(key)) {
        return annotations.get(key);
      }
    }
    return super.getAppProtocol(item);
  }

  /**
   * Filters a list of ApplicationSpec to include only those that are enabled.
   *
   * @param specs list of ApplicationSpec objects
   * @return filtered list containing only enabled applications
   */
  protected List<ApplicationSpec> filterEnabled(List<ApplicationSpec> specs) {
    return specs.stream().filter(app -> Boolean.TRUE.equals(app.getEnabled())).toList();
  }
}
