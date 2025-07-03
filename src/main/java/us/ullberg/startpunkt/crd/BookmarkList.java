package us.ullberg.startpunkt.crd;

import io.fabric8.kubernetes.api.model.DefaultKubernetesResourceList;

/**
 * Represents a list of Bookmark custom resources. Extends DefaultKubernetesResourceList to provide
 * standard list behavior.
 */
public class BookmarkList extends DefaultKubernetesResourceList<Bookmark> {
  // No additional implementation needed; inherits list behavior.
}
