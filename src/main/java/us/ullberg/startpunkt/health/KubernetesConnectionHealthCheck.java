package us.ullberg.startpunkt.health;

import org.eclipse.microprofile.health.HealthCheck;
import org.eclipse.microprofile.health.HealthCheckResponse;
import org.eclipse.microprofile.health.HealthCheckResponseBuilder;
import org.eclipse.microprofile.health.Readiness;

import io.fabric8.kubernetes.client.KubernetesClient;
import java.util.logging.Logger;

/**
 * {@link HealthCheck} to validate the service can talk to Kubernetes
 */
@Readiness
public class KubernetesConnectionHealthCheck implements HealthCheck {
  private static final Logger LOGGER = Logger.getLogger(KubernetesConnectionHealthCheck.class.getName());
  private final KubernetesClient client;

  public KubernetesConnectionHealthCheck(KubernetesClient client) {
    this.client = client;
  }

  @Override
  public HealthCheckResponse call() {
    HealthCheckResponseBuilder responseBuilder = HealthCheckResponse.named("Kubernetes connection health check");

    try {
      responseBuilder.withData("Version", client.getKubernetesVersion().getGitVersion());
      responseBuilder.withData("Nodes", client.nodes().list().getItems().size());
      responseBuilder.withData("Namespaces", client.namespaces().list().getItems().size());
      responseBuilder.withData("Startpunkt API group found", client.hasApiGroup("startpunkt.ullberg.us", true));
      responseBuilder.withData("OpenShift Route API group found", client.hasApiGroup("route.openshift.io", true));
      responseBuilder.withData("Hajimari API group found", client.hasApiGroup("hajimari.io", true));
      responseBuilder.withData("ForeCastle API group found", client.hasApiGroup("forecastle.stakater.com", true));
      responseBuilder.withData("Traefik API group found", client.hasApiGroup("traefik.io", true));

      responseBuilder.up();
    } catch (Exception e) {
      LOGGER.severe("Kubernetes health check failed: " + e.getMessage());
      responseBuilder.down()
        .withData("error", e.getMessage());
    }

    return responseBuilder.build();
  }
}
