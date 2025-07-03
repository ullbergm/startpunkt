package us.ullberg.startpunkt.health;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.eclipse.microprofile.health.HealthCheckResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import us.ullberg.startpunkt.rest.I8nResource;
import us.ullberg.startpunkt.service.I8nService;

class PingI8nResourceHealthCheckTest {

  private PingI8nResourceHealthCheck healthCheck;

  @BeforeEach
  void setUp() {
    healthCheck = new PingI8nResourceHealthCheck(new I8nResource(new I8nService()));
  }

  @Test
  void testPing() {
    var response = new I8nResource(new I8nService()).ping();
    var expectedResponse =
        HealthCheckResponse.named("Ping I8n REST Endpoint")
            .withData("Response", response)
            .up()
            .build();

    assertEquals(healthCheck.call().getData(), expectedResponse.getData());
  }
}
