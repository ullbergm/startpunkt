package us.ullberg.startpunkt.crd;

import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;

import io.fabric8.kubernetes.api.model.Namespaced;
import io.fabric8.kubernetes.client.CustomResource;
import io.fabric8.kubernetes.model.annotation.Group;
import io.fabric8.kubernetes.model.annotation.Plural;
import io.fabric8.kubernetes.model.annotation.Version;

@Version("v1alpha1")
@Group("startpunkt.ullberg.us")
@Plural("bookmarks")
public class Bookmark extends CustomResource<BookmarkSpec, BookmarkStatus> implements Namespaced {
  public Bookmark() {}

  public Bookmark(String name, String group, String icon, String url, String info,
      Boolean targetBlank, int location) {
    super();
    this.spec = new BookmarkSpec(name, group, icon, url, info, targetBlank, location);
  }

  @Override
  public int hashCode() {
    return new HashCodeBuilder().append(getSpec()).append(getStatus()).toHashCode();
  }

  @Override
  public boolean equals(Object other) {
    if (other == this) {
      return true;
    }
    if ((other instanceof Bookmark) == false) {
      return false;
    }
    Bookmark rhs = ((Bookmark) other);
    return new EqualsBuilder().append(getSpec(), rhs.getSpec()).append(getStatus(), rhs.getStatus())
        .isEquals();
  }
}
