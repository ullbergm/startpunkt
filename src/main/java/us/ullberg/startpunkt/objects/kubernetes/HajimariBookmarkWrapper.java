package us.ullberg.startpunkt.objects.kubernetes;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import us.ullberg.startpunkt.crd.BookmarkSpec;

/**
 * Wrapper for Hajimari bookmark custom resources. Provides access to bookmark properties from
 * the Kubernetes resource spec.
 */
public class HajimariBookmarkWrapper extends BaseKubernetesObject {

  /**
   * Constructs a wrapper for Hajimari bookmark custom resources. Uses group "hajimari.io",
   * version "v1alpha1", and plural "bookmarks".
   */
  public HajimariBookmarkWrapper() {
    super("hajimari.io", "v1alpha1", "bookmarks");
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
   * Gets the bookmark name from the resource spec.
   *
   * @param item the Kubernetes resource
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
   * Gets the bookmark group from the resource spec.
   *
   * @param item the Kubernetes resource
   * @return bookmark group in lowercase
   */
  protected String getBookmarkGroup(GenericKubernetesResource item) {
    String group = getOptionalSpecString(item, "group", null);
    if (group != null) {
      return group.toLowerCase();
    }
    // Fall back to namespace if spec group is not set
    return item.getMetadata().getNamespace().toLowerCase();
  }

  /**
   * Gets the bookmark URL from the resource spec.
   *
   * @param item the Kubernetes resource
   * @return bookmark URL as string
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
   * Gets the bookmark icon from the resource spec. Falls back to null if not
   * set.
   *
   * @param item the Kubernetes resource
   * @return icon URL or null
   */
  protected String getBookmarkIcon(GenericKubernetesResource item) {
    return getOptionalSpecString(item, "icon", null);
  }

  /**
   * Gets additional bookmark info from the resource spec. Falls back to null if
   * not set.
   *
   * @param item the Kubernetes resource
   * @return info text or null
   */
  protected String getBookmarkInfo(GenericKubernetesResource item) {
    return getOptionalSpecString(item, "info", null);
  }

  /**
   * Gets whether the bookmark should open in a new tab from the resource spec. Falls back to
   * null if not set.
   *
   * @param item the Kubernetes resource
   * @return true if targetBlank is set, otherwise null
   */
  protected Boolean getBookmarkTargetBlank(GenericKubernetesResource item) {
    var spec = getSpec(item);
    if (spec != null && spec.containsKey("targetBlank")) {
      return Boolean.parseBoolean(spec.get("targetBlank").toString());
    }
    return null;
  }

  /**
   * Gets the bookmark location ordering value from the resource spec. Falls back to 1000 if not
   * set. If 0 is returned, substitutes 1000.
   *
   * @param item the Kubernetes resource
   * @return location value for sorting
   */
  protected int getBookmarkLocation(GenericKubernetesResource item) {
    int location = getOptionalSpecInteger(item, "location", 1000);
    return location == 0 ? 1000 : location;
  }

  /**
   * Retrieves the instance tag from resource annotations.
   *
   * @param item Kubernetes resource
   * @return instance tag for filtering or null if not set
   */
  protected String getBookmarkInstance(GenericKubernetesResource item) {
    // Hajimari doesn't have instance in spec, only check annotations
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