package us.ullberg.startpunkt.health;

import org.eclipse.microprofile.health.HealthCheck;
import org.eclipse.microprofile.health.HealthCheckResponse;
import org.eclipse.microprofile.health.Liveness;

import us.ullberg.startpunkt.rest.ApplicationResource;

import java.util.logging.Logger;

/**
 * {@link HealthCheck} to ping the Application service
 */
@Liveness
public class PingApplicationResourceHealthCheck implements HealthCheck {
  private static final Logger LOGGER =
      Logger.getLogger(PingApplicationResourceHealthCheck.class.getName());
  private final ApplicationResource applicationResource;

  public PingApplicationResourceHealthCheck(ApplicationResource applicationResource) {
    this.applicationResource = applicationResource;
  }

  @Override
  public HealthCheckResponse call() {
    try {
      var response = this.applicationResource.ping();
      return HealthCheckResponse.named("Ping Application REST Endpoint")
          .withData("Response", response).up().build();
    } catch (Exception e) {
      LOGGER.severe("Ping to ApplicationResource failed: " + e.getMessage());
      return HealthCheckResponse.named("Ping Application REST Endpoint")
          .withData("error", e.getMessage()).down().build();
    }
  }
}
