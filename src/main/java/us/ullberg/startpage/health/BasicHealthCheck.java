package us.ullberg.startpage.health;

import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.health.HealthCheck;
import org.eclipse.microprofile.health.HealthCheckResponse;
import org.eclipse.microprofile.health.Liveness;

@Liveness
@ApplicationScoped
public class BasicHealthCheck implements HealthCheck {

  @Override
  public HealthCheckResponse call() {
    return HealthCheckResponse.up("Application is running");
  }
}
