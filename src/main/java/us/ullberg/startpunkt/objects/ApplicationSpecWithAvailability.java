package us.ullberg.startpunkt.objects;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.quarkus.runtime.annotations.RegisterForReflection;
import us.ullberg.startpunkt.crd.v1alpha4.ApplicationSpec;

/**
 * Wrapper for ApplicationSpec that adds runtime availability status. This class is used for API
 * responses only and does not modify the CRD. The availability status is computed at runtime by the
 * AvailabilityCheckService.
 */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
@RegisterForReflection(registerFullHierarchy = true)
public class ApplicationSpecWithAvailability extends ApplicationSpec {

  /** Whether the application is currently available (reachable). */
  @JsonProperty("available")
  private Boolean available;

  /** Default constructor. */
  public ApplicationSpecWithAvailability() {
    super();
  }

  /**
   * Creates a wrapper from an existing ApplicationSpec, copying all fields.
   *
   * @param spec the ApplicationSpec to wrap
   */
  public ApplicationSpecWithAvailability(ApplicationSpec spec) {
    this.name = spec.getName();
    this.setGroup(spec.getGroup());
    this.setIcon(spec.getIcon());
    this.setIconColor(spec.getIconColor());
    this.setUrl(spec.getUrl());
    this.setInfo(spec.getInfo());
    this.setTargetBlank(spec.getTargetBlank());
    this.setLocation(spec.getLocation());
    this.setEnabled(spec.getEnabled());
    this.setRootPath(spec.getRootPath());
    this.setTags(spec.getTags());
  }

  /**
   * Gets whether the application is currently available.
   *
   * @return true if the application is available, null if not yet checked
   */
  public Boolean getAvailable() {
    return available;
  }

  /**
   * Sets whether the application is currently available.
   *
   * @param available whether the application is available
   */
  public void setAvailable(Boolean available) {
    this.available = available;
  }
}
