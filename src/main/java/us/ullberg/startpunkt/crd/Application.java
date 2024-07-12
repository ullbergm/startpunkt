package us.ullberg.startpunkt.crd;

import io.fabric8.kubernetes.api.model.Namespaced;
import io.fabric8.kubernetes.client.CustomResource;
import io.fabric8.kubernetes.model.annotation.Group;
import io.fabric8.kubernetes.model.annotation.Plural;
import io.fabric8.kubernetes.model.annotation.Version;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;

@Version("v1alpha1")
@Group("startpunkt.ullberg.us")
@Plural("applications")
public class Application extends CustomResource<ApplicationSpec, ApplicationStatus>
    implements Namespaced {
  public Application() {
    super();
  }

  public Application(String name, String group, String icon, String iconColor, String url,
      String info, Boolean targetBlank, int location, Boolean enabled) {
    super();
    this.spec = new ApplicationSpec(name, group, icon, iconColor, url, info, targetBlank, location,
        enabled);
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
    if ((other instanceof Application) == false) {
      return false;
    }
    Application rhs = ((Application) other);
    return new EqualsBuilder().append(getSpec(), rhs.getSpec()).append(getStatus(), rhs.getStatus())
        .isEquals();
  }
}
