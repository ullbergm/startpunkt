package us.ullberg.startpunkt.health;

import org.eclipse.microprofile.health.HealthCheck;
import org.eclipse.microprofile.health.HealthCheckResponse;
import org.eclipse.microprofile.health.Liveness;

import us.ullberg.startpunkt.rest.I8nResource;

/**
 * {@link HealthCheck} to ping the I8n service
 */
@Liveness
public class PingI8nResourceHealthCheck implements HealthCheck {
  private final I8nResource i8nResource;

  public PingI8nResourceHealthCheck(I8nResource i8nResource) {
    this.i8nResource = i8nResource;
  }

  @Override
  public HealthCheckResponse call() {
    var response = this.i8nResource.ping();

    return HealthCheckResponse.named("Ping I8n REST Endpoint").withData("Response", response).up()
        .build();
  }
}
