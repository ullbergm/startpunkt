package us.ullberg.startpunkt.health;

import java.util.logging.Logger;
import org.eclipse.microprofile.health.HealthCheck;
import org.eclipse.microprofile.health.HealthCheckResponse;
import org.eclipse.microprofile.health.Liveness;
import us.ullberg.startpunkt.rest.I8nResource;

/**
 * {@link HealthCheck} implementation that performs a liveness check by pinging the I8n
 * (internationalization) REST resource.
 */
@Liveness
public class PingI8nResourceHealthCheck implements HealthCheck {
  private static final Logger LOGGER = Logger.getLogger(PingI8nResourceHealthCheck.class.getName());

  private final I8nResource i8nResource;

  /**
   * Constructor injecting the I8nResource to be pinged.
   *
   * @param i8nResource the I8n REST endpoint
   */
  public PingI8nResourceHealthCheck(I8nResource i8nResource) {
    this.i8nResource = i8nResource;
  }

  /**
   * Executes the health check by invoking the ping method on I8nResource.
   *
   * @return a HealthCheckResponse indicating up or down status with response data or error message
   */
  @Override
  public HealthCheckResponse call() {
    try {
      var response = this.i8nResource.ping();
      return HealthCheckResponse.named("Ping I8n REST Endpoint")
          .withData("Response", response)
          .up()
          .build();
    } catch (Exception e) {
      LOGGER.severe("Ping to I8nResource failed: " + e.getMessage());
      return HealthCheckResponse.named("Ping I8n REST Endpoint")
          .withData("error", e.getMessage())
          .down()
          .build();
    }
  }
}
