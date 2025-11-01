package us.ullberg.startpunkt.health;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.eclipse.microprofile.health.HealthCheckResponse;
import org.eclipse.microprofile.health.HealthCheckResponse.Status;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import us.ullberg.startpunkt.rest.ConfigResource;

class PingConfigResourceHealthCheckTest {

  private PingConfigResourceHealthCheck healthCheck;
  private ConfigResource configResource;

  @BeforeEach
  void setUp() {
    configResource = new ConfigResource();
    healthCheck = new PingConfigResourceHealthCheck(configResource);
  }

  @Test
  void testPing() {
    var response = configResource.ping();
    var expectedResponse =
        HealthCheckResponse.named("Ping Config REST Endpoint")
            .withData("Response", response)
            .up()
            .build();

    var actualResponse = healthCheck.call();

    assertEquals(expectedResponse.getData(), actualResponse.getData());
    assertEquals(expectedResponse.getName(), actualResponse.getName());
    assertEquals(expectedResponse.getStatus(), actualResponse.getStatus());
  }

  @Test
  void testCallReturnsNonNullResponse() {
    var response = healthCheck.call();
    assertNotNull(response);
  }

  @Test
  void testCallReturnsUpStatus() {
    var response = healthCheck.call();
    assertEquals(Status.UP, response.getStatus());
  }

  @Test
  void testCallReturnsCorrectName() {
    var response = healthCheck.call();
    assertEquals("Ping Config REST Endpoint", response.getName());
  }

  @Test
  void testCallIncludesResponseData() {
    var response = healthCheck.call();
    assertTrue(response.getData().isPresent());
    assertTrue(response.getData().get().containsKey("Response"));
  }

  @Test
  void testMultipleCallsConsistent() {
    var response1 = healthCheck.call();
    var response2 = healthCheck.call();

    assertEquals(response1.getStatus(), response2.getStatus());
    assertEquals(response1.getName(), response2.getName());
  }
}
