package us.ullberg.startpunkt.health;

import io.fabric8.kubernetes.client.KubernetesClient;
import java.util.logging.Logger;
import org.eclipse.microprofile.health.HealthCheck;
import org.eclipse.microprofile.health.HealthCheckResponse;
import org.eclipse.microprofile.health.HealthCheckResponseBuilder;
import org.eclipse.microprofile.health.Readiness;

/**
 * {@link HealthCheck} that verifies connectivity and availability of key Kubernetes API groups.
 *
 * <p>This readiness check queries the Kubernetes cluster for its version, node count, namespace
 * count, and presence of specific API groups used by the application.
 */
@Readiness
public class KubernetesConnectionHealthCheck implements HealthCheck {
  private static final Logger LOGGER =
      Logger.getLogger(KubernetesConnectionHealthCheck.class.getName());
  private final KubernetesClient client;

  /**
   * Constructs a KubernetesConnectionHealthCheck with the given Kubernetes client.
   *
   * @param client the Kubernetes client to use for health checks
   */
  public KubernetesConnectionHealthCheck(KubernetesClient client) {
    this.client = client;
  }

  /**
   * Performs the health check by querying Kubernetes cluster details and API group availability.
   *
   * @return a HealthCheckResponse indicating up/down status and cluster information
   */
  @Override
  public HealthCheckResponse call() {
    HealthCheckResponseBuilder responseBuilder =
        HealthCheckResponse.named("Kubernetes connection health check");

    try {
      responseBuilder.withData("Version", client.getKubernetesVersion().getGitVersion());
      responseBuilder.withData("Nodes", client.nodes().list().getItems().size());
      responseBuilder.withData("Namespaces", client.namespaces().list().getItems().size());
      responseBuilder.withData(
          "Startpunkt API group found", client.hasApiGroup("startpunkt.ullberg.us", true));
      responseBuilder.withData(
          "OpenShift Route API group found", client.hasApiGroup("route.openshift.io", true));
      responseBuilder.withData("Hajimari API group found", client.hasApiGroup("hajimari.io", true));
      responseBuilder.withData(
          "ForeCastle API group found", client.hasApiGroup("forecastle.stakater.com", true));
      responseBuilder.withData("Traefik API group found", client.hasApiGroup("traefik.io", true));

      responseBuilder.up();
    } catch (Exception e) {
      LOGGER.severe("Kubernetes health check failed: " + e.getMessage());
      responseBuilder.down().withData("error", e.getMessage());
    }

    return responseBuilder.build();
  }
}
