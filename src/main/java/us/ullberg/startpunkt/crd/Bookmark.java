package us.ullberg.startpunkt.crd;

import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;

import io.fabric8.kubernetes.api.model.Namespaced;
import io.fabric8.kubernetes.client.CustomResource;
import io.fabric8.kubernetes.model.annotation.Group;
import io.fabric8.kubernetes.model.annotation.Plural;
import io.fabric8.kubernetes.model.annotation.Version;

// Annotation to specify the version of the custom resource
@Version("v1alpha1")
// Annotation to specify the group name of the custom resource
@Group("startpunkt.ullberg.us")
// Annotation to specify the plural name of the custom resource
@Plural("bookmarks")
// Class representing a Bookmark custom resource
public class Bookmark extends CustomResource<BookmarkSpec, BookmarkStatus> implements Namespaced {

  // Default constructor
  public Bookmark() {}

  // Constructor to initialize the custom resource with specified values
  public Bookmark(String name, String group, String icon, String url, String info,
      Boolean targetBlank, int location) {
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
    return new EqualsBuilder().append(getSpec(), rhs.getSpec()).append(getStatus(), rhs.getStatus())
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
