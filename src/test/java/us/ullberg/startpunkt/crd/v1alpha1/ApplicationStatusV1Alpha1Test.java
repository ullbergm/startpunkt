package us.ullberg.startpunkt.crd.v1alpha1;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

/** Test class for ApplicationStatus v1alpha1. */
@QuarkusTest
class ApplicationStatusV1Alpha1Test {

  private final ObjectMapper mapper = new ObjectMapper();

  @Test
  void testApplicationStatusDefaultConstructor() {
    ApplicationStatus status = new ApplicationStatus();
    assertNotNull(status, "ApplicationStatus should be created");
  }

  @Test
  void testApplicationStatusSerialization() throws JsonProcessingException {
    ApplicationStatus status = new ApplicationStatus();
    String json = mapper.writeValueAsString(status);

    assertNotNull(json, "JSON should not be null");
    // Empty status should serialize to empty JSON object
    assertTrue(json.contains("{") && json.contains("}"), "JSON should be a valid object");
  }

  @Test
  void testApplicationStatusDeserialization() throws JsonProcessingException {
    String json = "{}";
    ApplicationStatus status = mapper.readValue(json, ApplicationStatus.class);

    assertNotNull(status, "Status should be deserialized");
  }
}
