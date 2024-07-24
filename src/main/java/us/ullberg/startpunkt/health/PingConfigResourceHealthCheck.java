package us.ullberg.startpunkt.health;

import org.eclipse.microprofile.health.HealthCheck;
import org.eclipse.microprofile.health.HealthCheckResponse;
import org.eclipse.microprofile.health.Liveness;

import us.ullberg.startpunkt.rest.ConfigResource;

/**
 * {@link HealthCheck} to ping the Config service
 */
@Liveness
public class PingConfigResourceHealthCheck implements HealthCheck {
  private final ConfigResource configResource;

  public PingConfigResourceHealthCheck(ConfigResource configResource) {
    this.configResource = configResource;
  }

  @Override
  public HealthCheckResponse call() {
    var response = this.configResource.ping();

    return HealthCheckResponse.named("Ping Config REST Endpoint").withData("Response", response)
        .up().build();
  }
}
