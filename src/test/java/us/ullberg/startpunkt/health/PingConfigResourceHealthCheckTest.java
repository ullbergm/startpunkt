package us.ullberg.startpunkt.health;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.eclipse.microprofile.health.HealthCheckResponse;

import us.ullberg.startpunkt.ConfigResource;

class PingConfigResourceHealthCheckTest {

  private PingConfigResourceHealthCheck healthCheck;

  @BeforeEach
  void setUp() {
    healthCheck = new PingConfigResourceHealthCheck(new ConfigResource());
  }

  @Test
  void testPing() {
    var response = new ConfigResource().ping();
    var expectedResponse = HealthCheckResponse.named("Ping Config REST Endpoint")
        .withData("Response", response).up().build();

    assertEquals(healthCheck.call().getData(), expectedResponse.getData());
  }
}
