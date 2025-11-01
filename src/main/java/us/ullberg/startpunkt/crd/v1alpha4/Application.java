package us.ullberg.startpunkt.crd.v1alpha4;

import io.fabric8.kubernetes.api.model.Namespaced;
import io.fabric8.kubernetes.client.CustomResource;
import io.fabric8.kubernetes.model.annotation.Group;
import io.fabric8.kubernetes.model.annotation.Plural;
import io.fabric8.kubernetes.model.annotation.Version;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * Represents the CustomResource for an Application. Maps to the Kubernetes resource
 * "applications.startpunkt.ullberg.us" version "v1alpha4". Contains the spec and status for the
 * Application.
 */
@Version(value = "v1alpha4", storage = true, served = true, deprecated = false)
@Group("startpunkt.ullberg.us")
@Plural("applications")
public class Application extends CustomResource<ApplicationSpec, ApplicationStatus>
    implements Namespaced {

  /** Creates a new Application instance with default values. */
  public Application() {
    super();
  }

  /**
   * Constructs an Application with the specified specification fields.
   *
   * @param name the application name
   * @param group the group the application belongs to
   * @param icon the application icon
   * @param iconColor the icon color
   * @param url the application URL
   * @param info additional information
   * @param targetBlank whether to open URL in new tab
   * @param location sorting order location
   * @param enabled whether the application is enabled
   */
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
    // Initialize the spec of the custom resource with the provided values
    this.spec =
        new ApplicationSpec(
            name, group, icon, iconColor, url, info, targetBlank, location, enabled);
  }

  /**
   * Constructs an Application with the specified specification fields.
   *
   * @param name the application name
   * @param group the group the application belongs to
   * @param icon the application icon
   * @param iconColor the icon color
   * @param url the application URL
   * @param info additional information
   * @param targetBlank whether to open URL in new tab
   * @param location sorting order location
   * @param enabled whether the application is enabled
   * @param rootPath root path to append to the URL
   */
  public Application(
      String name,
      String group,
      String icon,
      String iconColor,
      String url,
      String info,
      Boolean targetBlank,
      int location,
      Boolean enabled,
      String rootPath) {
    super();
    // Initialize the spec of the custom resource with the provided values
    this.spec =
        new ApplicationSpec(
            name, group, icon, iconColor, url, info, targetBlank, location, enabled, rootPath);
  }

  /**
   * Constructs an Application with the specified specification fields including tags.
   *
   * @param name the application name
   * @param group the group the application belongs to
   * @param icon the application icon
   * @param iconColor the icon color
   * @param url the application URL
   * @param info additional information
   * @param targetBlank whether to open URL in new tab
   * @param location sorting order location
   * @param enabled whether the application is enabled
   * @param rootPath root path to append to the URL
   * @param tags comma-separated tags for filtering
   */
  public Application(
      String name,
      String group,
      String icon,
      String iconColor,
      String url,
      String info,
      Boolean targetBlank,
      int location,
      Boolean enabled,
      String rootPath,
      String tags) {
    super();
    // Initialize the spec of the custom resource with the provided values
    this.spec =
        new ApplicationSpec(
            name,
            group,
            icon,
            iconColor,
            url,
            info,
            targetBlank,
            location,
            enabled,
            rootPath,
            tags);
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
