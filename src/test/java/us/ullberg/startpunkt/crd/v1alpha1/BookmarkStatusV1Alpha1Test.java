package us.ullberg.startpunkt.crd.v1alpha1;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

/** Test class for BookmarkStatus v1alpha1. */
@QuarkusTest
class BookmarkStatusV1Alpha1Test {

  private final ObjectMapper mapper = new ObjectMapper();

  @Test
  void testBookmarkStatusDefaultConstructor() {
    BookmarkStatus status = new BookmarkStatus();
    assertNotNull(status, "BookmarkStatus should be created");
  }

  @Test
  void testBookmarkStatusSerialization() throws JsonProcessingException {
    BookmarkStatus status = new BookmarkStatus();
    String json = mapper.writeValueAsString(status);

    assertNotNull(json, "JSON should not be null");
    assertTrue(json.contains("{") && json.contains("}"), "JSON should be a valid object");
  }

  @Test
  void testBookmarkStatusDeserialization() throws JsonProcessingException {
    String json = "{}";
    BookmarkStatus status = mapper.readValue(json, BookmarkStatus.class);

    assertNotNull(status, "Status should be deserialized");
  }
}
