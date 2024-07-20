package us.ullberg.startpunkt.health;

import org.eclipse.microprofile.health.HealthCheck;
import org.eclipse.microprofile.health.HealthCheckResponse;
import org.eclipse.microprofile.health.HealthCheckResponseBuilder;
import org.eclipse.microprofile.health.Readiness;

import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.KubernetesClientBuilder;
import jakarta.enterprise.context.ApplicationScoped;

// Annotation indicating that this health check is for readiness
@Readiness
// Indicates that this bean is application scoped
@ApplicationScoped
public class KubernetesHealthCheck implements HealthCheck {

  // Method that performs the health check
  @Override
  public HealthCheckResponse call() {
    // Create a response builder for the health check with a name
    HealthCheckResponseBuilder responseBuilder =
        HealthCheckResponse.named("Kubernetes connection health check");

    try (final KubernetesClient client = new KubernetesClientBuilder().build()) {
      // Attempt to list namespaces to check the connection to Kubernetes
      client.namespaces().list();

      // If successful, mark the health check as 'up'
      responseBuilder.up();
    } catch (Exception e) {
      // If an exception occurs, mark the health check as 'down'
      responseBuilder.down();
    }

    // Build and return the health check response
    return responseBuilder.build();
  }
}
