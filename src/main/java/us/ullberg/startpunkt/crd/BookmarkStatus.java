package us.ullberg.startpunkt.crd;

import com.fasterxml.jackson.annotation.JsonInclude;

// Class representing the status of a Bookmark custom resource
// Include non-empty JSON properties in serialization
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class BookmarkStatus {
  // This class is currently empty, but it can be extended to include status fields
  // For example, you might add fields like 'statusMessage', 'lastUpdated', etc.
}
