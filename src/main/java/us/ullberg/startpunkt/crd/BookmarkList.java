package us.ullberg.startpunkt.crd;

import io.fabric8.kubernetes.api.model.DefaultKubernetesResourceList;

// Class representing a list of Bookmark custom resources
public class BookmarkList extends DefaultKubernetesResourceList<Bookmark> {
  // This class extends DefaultKubernetesResourceList to provide a list of Bookmark resources.
  // No additional fields or methods are required as it inherits functionality from
  // DefaultKubernetesResourceList.
}
