package us.ullberg.startpunkt.health;

import org.eclipse.microprofile.health.HealthCheck;
import org.eclipse.microprofile.health.HealthCheckResponse;
import org.eclipse.microprofile.health.HealthCheckResponseBuilder;
import org.eclipse.microprofile.health.Readiness;

import io.fabric8.kubernetes.client.KubernetesClient;

/**
 * {@link HealthCheck} to validate the service can talk to Kubernetes
 */
@Readiness
public class KubernetesConnectionHealthCheck implements HealthCheck {
  private final KubernetesClient client;

  public KubernetesConnectionHealthCheck(KubernetesClient client) {
    this.client = client;
  }

  @Override
  public HealthCheckResponse call() {
    HealthCheckResponseBuilder responseBuilder =
        HealthCheckResponse.named("Kubernetes connection health check");

    try {
      // Attempt to list namespaces to check the connection to Kubernetes
      responseBuilder.withData("Version", client.getKubernetesVersion().getGitVersion());
      responseBuilder.withData("Nodes", client.nodes().list().getItems().size());
      responseBuilder.withData("Namespaces", client.namespaces().list().getItems().size());
      responseBuilder.withData("Startpunkt API group found", client.hasApiGroup("startpunkt.ullberg.us", true));
      responseBuilder.withData("OpenShift Route API group found", client.hasApiGroup("route.openshift.io", true));
      responseBuilder.withData("Hajimari API group found", client.hasApiGroup("hajimari.io", true));
      responseBuilder.withData("ForeCastle API group found", client.hasApiGroup("forecastle.stakater.com", true));
      responseBuilder.withData("Traefik API group found", client.hasApiGroup("traefik.io", true));

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
