package us.ullberg.startpunkt.crd;

import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;

import io.fabric8.kubernetes.api.model.Namespaced;
import io.fabric8.kubernetes.client.CustomResource;
import io.fabric8.kubernetes.model.annotation.Group;
import io.fabric8.kubernetes.model.annotation.Plural;
import io.fabric8.kubernetes.model.annotation.Version;
import org.apache.commons.lang3.builder.ToStringBuilder;

// Annotation to specify the version of the custom resource
@Version("v1alpha1")
// Annotation to specify the group name of the custom resource
@Group("startpunkt.ullberg.us")
// Annotation to specify the plural name of the custom resource
@Plural("applications")
public class Application extends CustomResource<ApplicationSpec, ApplicationStatus>
    implements Namespaced {

  // Default constructor
  public Application() {
    super();
  }

  // Constructor to initialize the custom resource with specified values
  public Application(String name, String group, String icon, String iconColor, String url,
      String info, Boolean targetBlank, int location, Boolean enabled) {
    super();
    // Initialize the spec of the custom resource with the provided values
    this.spec = new ApplicationSpec(name, group, icon, iconColor, url, info, targetBlank, location,
        enabled);
  }

  // Override the hashCode method to generate a hash code based on the spec and status
  @Override
  public int hashCode() {
    return new HashCodeBuilder().append(getSpec()).append(getStatus()).toHashCode();
  }

  // Override the equals method to compare Application objects based on their spec and status
  @Override
  public boolean equals(Object other) {
    if (other == this) {
      return true;
    }
    if (!(other instanceof Application)) {
      return false;
    }
    Application rhs = ((Application) other);
    return new EqualsBuilder().append(getSpec(), rhs.getSpec()).append(getStatus(), rhs.getStatus())
        .isEquals();
  }

  @Override
  public String toString() {
    return new ToStringBuilder(this).append("spec", getSpec()).append("status", getStatus())
        .toString();
  }
}
