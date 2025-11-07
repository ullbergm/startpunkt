package us.ullberg.startpunkt.crd.v1alpha3;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Represents the status subresource of a Bookmark custom resource.
 *
 * <p>This class is currently empty but can be extended to include status-related fields such as
 * status messages, timestamps, or other runtime information about the Bookmark resource.
 */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class BookmarkStatus {
  /** Default constructor. */
  public BookmarkStatus() {
    // No special initialization needed
  }

  // Intentionally left empty for future status fields

}
