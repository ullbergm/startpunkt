package us.ullberg.startpunkt.crd;

import io.fabric8.kubernetes.api.model.Namespaced;
import io.fabric8.kubernetes.client.CustomResource;
import io.fabric8.kubernetes.model.annotation.Group;
import io.fabric8.kubernetes.model.annotation.Version;

@Version("v1alpha1")
@Group("startpunkt.ullberg.us")
public class Bookmark extends CustomResource<BookmarkSpec, BookmarkStatus>
    implements Namespaced, Comparable<Bookmark> {
  public Bookmark(String name, String group, String icon, String url, String info,
      Boolean targetBlank, int location) {
    super();
    this.spec = new BookmarkSpec(name, group, icon, url, info, targetBlank, location);
  }

  // Implement Comparable interface
  @Override
  public int compareTo(Bookmark other) {
    // Compare by name
    return this.getSpec().compareTo(other.getSpec());
  }
}
