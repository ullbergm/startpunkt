package us.ullberg.startpunkt.health;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.eclipse.microprofile.health.HealthCheckResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import us.ullberg.startpunkt.rest.ApplicationResource;

class PingApplicationResourceHealthCheckTest {

  private PingApplicationResourceHealthCheck healthCheck;
  private ApplicationResource applicationResource;

  @BeforeEach
  void setUp() {
    // For ping test, we don't need a real client, so we can pass null
    // The ping method doesn't use the KubernetesClient
    applicationResource = new ApplicationResource(null);
    healthCheck = new PingApplicationResourceHealthCheck(applicationResource);
  }

  @Test
  void testPing() {
    var response = applicationResource.ping();
    var expectedResponse =
        HealthCheckResponse.named("Ping Application REST Endpoint")
            .withData("Response", response)
            .up()
            .build();

    var actualResponse = healthCheck.call();

    assertEquals(expectedResponse.getData(), actualResponse.getData());
  }
}
