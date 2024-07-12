package us.ullberg.startpunkt.health;

import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.health.HealthCheck;
import org.eclipse.microprofile.health.HealthCheckResponse;
import org.eclipse.microprofile.health.Liveness;

// Annotation to indicate this is a liveness health check
@Liveness
// Annotation to specify that this bean is application scoped
@ApplicationScoped
public class BasicHealthCheck implements HealthCheck {

  // Override the call method to perform the health check
  @Override
  public HealthCheckResponse call() {
    // Return a HealthCheckResponse indicating the application is running
    return HealthCheckResponse.up("Application is running");
  }
}
