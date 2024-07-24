package us.ullberg.startpunkt.health;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import us.ullberg.startpunkt.rest.ApplicationResource;

import org.eclipse.microprofile.health.HealthCheckResponse;

class PingApplicationResourceHealthCheckTest {

  private PingApplicationResourceHealthCheck healthCheck;

  @BeforeEach
  void setUp() {
    healthCheck = new PingApplicationResourceHealthCheck(new ApplicationResource());
  }

  @Test
  void testPing() {
    var response = new ApplicationResource().ping();
    var expectedResponse = HealthCheckResponse.named("Ping Application REST Endpoint")
        .withData("Response", response).up().build();

    assertEquals(healthCheck.call().getData(), expectedResponse.getData());
  }
}
