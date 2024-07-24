package us.ullberg.startpunkt.health;

import org.eclipse.microprofile.health.HealthCheck;
import org.eclipse.microprofile.health.HealthCheckResponse;
import org.eclipse.microprofile.health.Liveness;

import us.ullberg.startpunkt.ApplicationResource;

/**
 * {@link HealthCheck} to ping the Hero service
 */
@Liveness
public class PingApplicationResourceHealthCheck implements HealthCheck {
  private final ApplicationResource applicationResource;

  public PingApplicationResourceHealthCheck(ApplicationResource applicationResource) {
    this.applicationResource = applicationResource;
  }

  @Override
  public HealthCheckResponse call() {
    var response = this.applicationResource.ping();

    return HealthCheckResponse.named("Ping Application REST Endpoint").withData("Response", response).up().build();
  }
}
