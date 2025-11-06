package us.ullberg.startpunkt.crd.v1alpha2;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Represents the status of an {@link Application} custom resource. This class can be extended to
 * include status-related fields.
 *
 * <p>Non-empty JSON properties are included in serialization.
 */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class ApplicationStatus {
  /**
   * Creates an empty ApplicationStatus. Explicit constructor provided for clarity and documentation
   * compliance.
   */
  public ApplicationStatus() {
    super();
  }

  // This class is currently empty, but it can be extended to include status fields
}
