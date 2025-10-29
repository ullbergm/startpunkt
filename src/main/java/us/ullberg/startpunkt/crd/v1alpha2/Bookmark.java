package us.ullberg.startpunkt.crd.v1alpha2;

import io.fabric8.kubernetes.api.model.Namespaced;
import io.fabric8.kubernetes.client.CustomResource;
import io.fabric8.kubernetes.model.annotation.Group;
import io.fabric8.kubernetes.model.annotation.Plural;
import io.fabric8.kubernetes.model.annotation.Version;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * Represents a Kubernetes custom resource for a Bookmark. This resource is namespaced and includes
 * specifications and status.
 */
@Version(value = "v1alpha2", storage = false, served = true, deprecated = true)
@Group("startpunkt.ullberg.us")
@Plural("bookmarks")
public class Bookmark extends CustomResource<BookmarkSpec, BookmarkStatus> implements Namespaced {

  /** Default no-argument constructor. */
  public Bookmark() {}

  /**
   * Constructs a Bookmark resource with the given properties.
   *
   * @param name the bookmark name
   * @param group the group the bookmark belongs to
   * @param icon icon identifier or URL
   * @param url the bookmark URL
   * @param info additional info about the bookmark
   * @param targetBlank whether to open URL in a new tab
   * @param location sort order or location of the bookmark
   */
  public Bookmark(
      String name,
      String group,
      String icon,
      String url,
      String info,
      Boolean targetBlank,
      int location) {
    super();
    // Initialize the spec of the custom resource with the provided values
    this.spec = new BookmarkSpec(name, group, icon, url, info, targetBlank, location);
  }

  // Override the hashCode method to generate a hash code based on the spec and status
  @Override
  public int hashCode() {
    return new HashCodeBuilder().append(getSpec()).append(getStatus()).toHashCode();
  }

  // Override the equals method to compare Bookmark objects based on their spec and status
  @Override
  public boolean equals(Object other) {
    if (other == this) {
      return true;
    }
    if (!(other instanceof Bookmark)) {
      return false;
    }
    Bookmark rhs = ((Bookmark) other);
    return new EqualsBuilder()
        .append(getSpec(), rhs.getSpec())
        .append(getStatus(), rhs.getStatus())
        .isEquals();
  }

  @Override
  public String toString() {
    return new ToStringBuilder(this)
        .append("spec", getSpec())
        .append("status", getStatus())
        .toString();
  }
}
