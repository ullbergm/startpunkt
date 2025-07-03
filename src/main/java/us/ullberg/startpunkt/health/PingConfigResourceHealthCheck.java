package us.ullberg.startpunkt.health;

import java.util.logging.Logger;
import org.eclipse.microprofile.health.HealthCheck;
import org.eclipse.microprofile.health.HealthCheckResponse;
import org.eclipse.microprofile.health.Liveness;
import us.ullberg.startpunkt.rest.ConfigResource;

/**
 * {@link HealthCheck} implementation that performs a liveness check by pinging the Config REST
 * resource.
 */
@Liveness
public class PingConfigResourceHealthCheck implements HealthCheck {
  private static final Logger LOGGER =
      Logger.getLogger(PingConfigResourceHealthCheck.class.getName());

  private final ConfigResource configResource;

  /**
   * Constructor injecting the ConfigResource to be pinged.
   *
   * @param configResource the Config REST endpoint
   */
  public PingConfigResourceHealthCheck(ConfigResource configResource) {
    this.configResource = configResource;
  }

  /**
   * Executes the health check by invoking the ping method on ConfigResource.
   *
   * @return a HealthCheckResponse indicating up or down status with response data or error message
   */
  @Override
  public HealthCheckResponse call() {
    try {
      var response = this.configResource.ping();
      return HealthCheckResponse.named("Ping Config REST Endpoint")
          .withData("Response", response)
          .up()
          .build();
    } catch (Exception e) {
      LOGGER.severe("Ping to ConfigResource failed: " + e.getMessage());
      return HealthCheckResponse.named("Ping Config REST Endpoint")
          .withData("error", e.getMessage())
          .down()
          .build();
    }
  }
}
