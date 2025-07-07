package us.ullberg.startpunkt.objects.kubernetes;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import us.ullberg.startpunkt.crd.BookmarkSpec;

/**
 * Wrapper for Startpunkt bookmark Kubernetes custom resources. This class extracts
 * bookmark-specific information from the resource's spec with fallbacks to defaults from the
 * base class.
 */
public class StartpunktBookmarkWrapper extends BaseKubernetesObject {

  /**
   * Constructs a StartpunktBookmarkWrapper with group "startpunkt.ullberg.us", version
   * "v1alpha1", and plural "bookmarks".
   */
  public StartpunktBookmarkWrapper() {
    super("startpunkt.ullberg.us", "v1alpha1", "bookmarks");
  }

  /**
   * Maps a GenericKubernetesResource to a BookmarkSpec instance.
   *
   * @param item the Kubernetes generic resource
   * @return the BookmarkSpec mapped from the resource
   */
  public BookmarkSpec mapToBookmarkSpec(GenericKubernetesResource item) {
    return new BookmarkSpec(
        getBookmarkName(item),
        getBookmarkGroup(item),
        getBookmarkIcon(item),
        getBookmarkUrl(item),
        getBookmarkInfo(item),
        getBookmarkTargetBlank(item),
        getBookmarkLocation(item),
        getBookmarkInstance(item));
  }

  /**
   * Retrieves the bookmark name from the resource spec. This property is required.
   *
   * @param item Kubernetes resource
   * @return bookmark name 
   */
  protected String getBookmarkName(GenericKubernetesResource item) {
    String name = getOptionalSpecString(item, "name", null);
    if (name != null) {
      return name;
    }
    // Fall back to metadata name if spec name is not set
    return item.getMetadata().getName();
  }

  /**
   * Retrieves the bookmark group from the resource spec. Returns namespace if not
   * present.
   *
   * @param item Kubernetes resource
   * @return bookmark group in lowercase
   */
  protected String getBookmarkGroup(GenericKubernetesResource item) {
    return getOptionalSpecString(item, "group", item.getMetadata().getNamespace()).toLowerCase();
  }

  /**
   * Retrieves the bookmark URL from the resource spec. This property is required.
   *
   * @param item Kubernetes resource
   * @return bookmark URL
   */
  protected String getBookmarkUrl(GenericKubernetesResource item) {
    String url = getOptionalSpecString(item, "url", null);
    if (url != null) {
      return url;
    }
    // If no URL is set, return null (bookmark may not be valid but won't crash)
    return null;
  }

  /**
   * Retrieves the bookmark icon from the resource spec. Returns null if not present.
   *
   * @param item Kubernetes resource
   * @return icon string or null
   */
  protected String getBookmarkIcon(GenericKubernetesResource item) {
    return getOptionalSpecString(item, "icon", null);
  }

  /**
   * Retrieves additional information (info) from the resource spec. Returns null if not
   * present.
   *
   * @param item Kubernetes resource
   * @return info string or null
   */
  protected String getBookmarkInfo(GenericKubernetesResource item) {
    return getOptionalSpecString(item, "info", null);
  }

  /**
   * Retrieves the targetBlank flag from the resource spec. Returns false if not
   * present.
   *
   * @param item Kubernetes resource
   * @return Boolean indicating if the link should open in a new tab, or null if not set
   */
  protected Boolean getBookmarkTargetBlank(GenericKubernetesResource item) {
    var spec = getSpec(item);
    if (spec != null && spec.containsKey("targetBlank")) {
      return Boolean.parseBoolean(spec.get("targetBlank").toString());
    }
    return null;
  }

  /**
   * Retrieves the location (sorting order) from the resource spec. If location is zero, returns
   * 1000 for backwards compatibility. Returns 1000 if not present.
   *
   * @param item Kubernetes resource
   * @return integer location value
   */
  protected int getBookmarkLocation(GenericKubernetesResource item) {
    int location = getOptionalSpecInteger(item, "location", 1000);
    return location == 0 ? 1000 : location;
  }

  /**
   * Retrieves the instance tag from either the resource spec or annotations.
   *
   * @param item Kubernetes resource
   * @return instance tag for filtering or null if not set
   */
  protected String getBookmarkInstance(GenericKubernetesResource item) {
    // First check the spec for instance field
    String specInstance = getOptionalSpecString(item, "instance", null);
    if (specInstance != null) {
      return specInstance;
    }
    
    // Fall back to checking annotations
    var annotations = getAnnotations(item);
    if (annotations != null && annotations.containsKey("startpunkt.ullberg.us/instance")) {
      return annotations.get("startpunkt.ullberg.us/instance");
    }
    
    return null;
  }

  /**
   * Determines whether to include a bookmark based on instance filtering.
   *
   * @param item the Kubernetes resource
   * @param instanceFilter the instance filter value, or null for no filtering
   * @return true if the bookmark should be included
   */
  public boolean shouldIncludeByInstance(GenericKubernetesResource item, String instanceFilter) {
    if (instanceFilter == null || instanceFilter.isEmpty()) {
      return true; // No filtering
    }
    
    String itemInstance = getBookmarkInstance(item);
    return itemInstance == null || itemInstance.equals(instanceFilter);
  }
}