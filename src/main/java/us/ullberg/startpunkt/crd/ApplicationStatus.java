package us.ullberg.startpunkt.crd;

import com.fasterxml.jackson.annotation.JsonInclude;

// Class representing the status of an Application custom resource
// Include non-empty JSON properties in serialization
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class ApplicationStatus {
  // This class is currently empty, but it can be extended to include status fields
}
