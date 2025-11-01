package us.ullberg.startpunkt.health;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.eclipse.microprofile.health.HealthCheckResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import us.ullberg.startpunkt.rest.ThemeResource;

class PingThemeResourceHealthCheckTest {

  private PingThemeResourceHealthCheck healthCheck;
  private ThemeResource themeResource;

  @BeforeEach
  void setUp() {
    themeResource = new ThemeResource();
    healthCheck = new PingThemeResourceHealthCheck(themeResource);
  }

  @Test
  void testPing() {
    var response = themeResource.ping();
    var expectedResponse =
        HealthCheckResponse.named("Ping Theme REST Endpoint")
            .withData("Response", response)
            .up()
            .build();

    var actualResponse = healthCheck.call();

    assertEquals(expectedResponse.getData(), actualResponse.getData());
    assertEquals(expectedResponse.getName(), actualResponse.getName());
    assertEquals(expectedResponse.getStatus(), actualResponse.getStatus());
  }
}
