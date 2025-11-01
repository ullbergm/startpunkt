package us.ullberg.startpunkt.health;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.eclipse.microprofile.health.HealthCheckResponse;
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
}
