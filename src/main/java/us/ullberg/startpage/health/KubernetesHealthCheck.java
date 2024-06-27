package us.ullberg.startpage.health;

import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.KubernetesClientBuilder;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.health.HealthCheck;
import org.eclipse.microprofile.health.HealthCheckResponse;
import org.eclipse.microprofile.health.HealthCheckResponseBuilder;
import org.eclipse.microprofile.health.Readiness;

@Readiness
@ApplicationScoped
public class KubernetesHealthCheck implements HealthCheck {
  @Override
  public HealthCheckResponse call() {
    HealthCheckResponseBuilder responseBuilder =
        HealthCheckResponse.named("Kubernetes connection health check");

    try (final KubernetesClient client = new KubernetesClientBuilder().build()) {
      client.namespaces().list();

      responseBuilder.up();
    } catch (Exception e) {
      responseBuilder.down();
    }

    return responseBuilder.build();
  }
}
