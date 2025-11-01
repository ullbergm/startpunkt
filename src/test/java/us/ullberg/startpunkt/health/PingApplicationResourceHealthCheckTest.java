package us.ullberg.startpunkt.health;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.eclipse.microprofile.health.HealthCheckResponse;
import org.eclipse.microprofile.health.HealthCheckResponse.Status;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import us.ullberg.startpunkt.rest.ApplicationResource;

class PingApplicationResourceHealthCheckTest {

  private PingApplicationResourceHealthCheck healthCheck;
  private ApplicationResource applicationResource;

  @BeforeEach
  void setUp() {
    // For ping test, we don't need a real client or availability service, so we can pass null
    // The ping method doesn't use the KubernetesClient or AvailabilityCheckService
    applicationResource = new ApplicationResource(null, null);
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

  @Test
  void testCallReturnsNonNullResponse() {
    var response = healthCheck.call();
    assertNotNull(response, "Health check response should not be null");
  }

  @Test
  void testCallReturnsUpStatus() {
    var response = healthCheck.call();
    assertEquals(Status.UP, response.getStatus(), "Health check should return UP status");
  }

  @Test
  void testCallReturnsCorrectName() {
    var response = healthCheck.call();
    assertEquals("Ping Application REST Endpoint", response.getName(), 
        "Health check should have correct name");
  }

  @Test
  void testCallIncludesResponseData() {
    var response = healthCheck.call();
    assertTrue(response.getData().isPresent(), "Health check should include response data");
    assertTrue(response.getData().get().containsKey("Response"), 
        "Response data should contain 'Response' key");
  }

  @Test
  void testMultipleCallsReturnConsistentResults() {
    var response1 = healthCheck.call();
    var response2 = healthCheck.call();
    
    assertEquals(response1.getStatus(), response2.getStatus(), 
        "Multiple calls should return consistent status");
    assertEquals(response1.getName(), response2.getName(), 
        "Multiple calls should return same name");
  }

  @Test
  void testHealthCheckWithValidResource() {
    // Create new instance to ensure clean state
    var resource = new ApplicationResource(null, null);
    var check = new PingApplicationResourceHealthCheck(resource);
    
    var response = check.call();
    assertEquals(Status.UP, response.getStatus());
  }
}
