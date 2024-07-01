package us.ullberg.startpunkt.crd;

import io.fabric8.kubernetes.api.model.Namespaced;
import io.fabric8.kubernetes.client.CustomResource;
import io.fabric8.kubernetes.model.annotation.Group;
import io.fabric8.kubernetes.model.annotation.Version;

@Version("v1alpha1")
@Group("startpunkt.ullberg.us")
public class Application extends CustomResource<ApplicationSpec, ApplicationStatus>
    implements Namespaced, Comparable<Application> {
  public Application(
      String name,
      String group,
      String icon,
      String iconColor,
      String url,
      String info,
      Boolean targetBlank,
      int location,
      Boolean enabled) {
    super();
    this.spec =
        new ApplicationSpec(
            name, group, icon, iconColor, url, info, targetBlank, location, enabled);
  }

  // Implement Comparable interface
  @Override
  public int compareTo(Application other) {
    // Compare by name
    return this.getSpec().compareTo(other.getSpec());
  }
}
