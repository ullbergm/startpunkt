package us.ullberg.startpunkt.health;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import us.ullberg.startpunkt.rest.ThemeResource;

import org.eclipse.microprofile.health.HealthCheckResponse;

class PingThemeResourceHealthCheckTest {

  private PingThemeResourceHealthCheck healthCheck;

  @BeforeEach
  void setUp() {
    healthCheck = new PingThemeResourceHealthCheck(new ThemeResource());
  }

  @Test
  void testPing() {
    var response = new ThemeResource().ping();
    var expectedResponse = HealthCheckResponse.named("Ping Theme REST Endpoint")
        .withData("Response", response).up().build();

    assertEquals(healthCheck.call().getData(), expectedResponse.getData());
  }
}
