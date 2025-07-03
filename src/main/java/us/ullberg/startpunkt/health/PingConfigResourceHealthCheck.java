package us.ullberg.startpunkt.health;

import org.eclipse.microprofile.health.HealthCheck;
import org.eclipse.microprofile.health.HealthCheckResponse;
import org.eclipse.microprofile.health.Liveness;

import us.ullberg.startpunkt.rest.ConfigResource;

import java.util.logging.Logger;

/**
 * {@link HealthCheck} to ping the Config service
 */
@Liveness
public class PingConfigResourceHealthCheck implements HealthCheck {
  private static final Logger LOGGER = Logger.getLogger(PingConfigResourceHealthCheck.class.getName());
  private final ConfigResource configResource;

  public PingConfigResourceHealthCheck(ConfigResource configResource) {
    this.configResource = configResource;
  }

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
