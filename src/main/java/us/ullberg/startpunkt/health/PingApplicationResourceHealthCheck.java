package us.ullberg.startpunkt.health;

import java.util.logging.Logger;
import org.eclipse.microprofile.health.HealthCheck;
import org.eclipse.microprofile.health.HealthCheckResponse;
import org.eclipse.microprofile.health.Liveness;
import us.ullberg.startpunkt.rest.ApplicationResource;

/**
 * {@link HealthCheck} implementation that performs a liveness check by pinging the Application REST
 * resource.
 */
@Liveness
public class PingApplicationResourceHealthCheck implements HealthCheck {
  private static final Logger LOGGER =
      Logger.getLogger(PingApplicationResourceHealthCheck.class.getName());

  private final ApplicationResource applicationResource;

  /**
   * Constructor injecting the ApplicationResource to be pinged.
   *
   * @param applicationResource the Application REST endpoint
   */
  public PingApplicationResourceHealthCheck(ApplicationResource applicationResource) {
    this.applicationResource = applicationResource;
  }

  /**
   * Executes the health check by invoking the ping method on ApplicationResource.
   *
   * @return a HealthCheckResponse indicating up or down status with response data or error message
   */
  @Override
  public HealthCheckResponse call() {
    try {
      var response = this.applicationResource.ping();
      return HealthCheckResponse.named("Ping Application REST Endpoint")
          .withData("Response", response)
          .up()
          .build();
    } catch (Exception e) {
      LOGGER.severe("Ping to ApplicationResource failed: " + e.getMessage());
      return HealthCheckResponse.named("Ping Application REST Endpoint")
          .withData("error", e.getMessage())
          .down()
          .build();
    }
  }
}
