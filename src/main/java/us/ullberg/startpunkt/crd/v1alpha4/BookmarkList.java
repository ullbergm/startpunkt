package us.ullberg.startpunkt.crd.v1alpha4;

import io.fabric8.kubernetes.api.model.DefaultKubernetesResourceList;

/**
 * Represents a list of {@link Bookmark} custom resources. Extends {@link
 * DefaultKubernetesResourceList} to provide standard list behavior.
 */
public class BookmarkList extends DefaultKubernetesResourceList<Bookmark> {

  /**
   * Creates an empty BookmarkList. Required to satisfy tools that enforce explicit constructor
   * documentation.
   */
  public BookmarkList() {
    super();
  }

  // No additional implementation needed; inherits list behavior.
}
