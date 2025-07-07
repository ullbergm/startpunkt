package us.ullberg.startpunkt.objects.kubernetes;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import io.fabric8.kubernetes.client.KubernetesClient;
import java.util.ArrayList;
import java.util.List;
import us.ullberg.startpunkt.crd.ApplicationSpec;

/**
 * Wrapper class for Kubernetes Gateway API HTTPRoute resources. Provides methods to extract
 * application URLs and specifications from HTTPRoute Kubernetes custom resources.
 */
public class GatewayApiHttpRouteWrapper extends AnnotatedKubernetesObject {

  /** Indicates whether to process only annotated HTTPRoute objects. */
  private Boolean onlyAnnotated = false;

  /** Default protocol to use when none is specified in the HTTPRoute spec. */
  private String defaultProtocol = "http";

  /**
   * Constructs a GatewayApiHttpRouteWrapper.
   *
   * @param onlyAnnotated whether to filter and process only annotated HTTPRoute resources
   * @param defaultProtocol the default protocol (e.g., "http" or "https") to use for app URLs
   */
  public GatewayApiHttpRouteWrapper(Boolean onlyAnnotated, String defaultProtocol) {
    super("gateway.networking.k8s.io", "v1", "httproutes");
    this.onlyAnnotated = onlyAnnotated;
    this.defaultProtocol = defaultProtocol;
  }

  /**
   * Extracts the application URL from the given HTTPRoute resource. Uses the protocol from the
   * resource spec if available; otherwise falls back to the default protocol. Uses the first
   * hostname in the "hostnames" spec field or "localhost" if none are defined.
   *
   * @param item the Kubernetes HTTPRoute resource
   * @return the constructed application URL as a String
   */
  @Override
  protected String getAppUrl(GenericKubernetesResource item) {
    var spec = getSpec(item);

    String protocol = getAppProtocol(item);
    if (protocol == null) {
      protocol = defaultProtocol;
    }

    @SuppressWarnings("unchecked")
    ArrayList<String> hosts =
        spec.containsKey("hostnames")
            ? (ArrayList<String>) spec.get("hostnames")
            : new ArrayList<>();
    if (hosts.isEmpty()) {
      hosts.add("localhost");
    }

    return protocol + "://" + hosts.get(0);
  }

  /**
   * Retrieves a list of ApplicationSpec objects for matching HTTPRoute resources. If the wrapper is
   * configured to only include annotated resources, filters the result accordingly.
   *
   * @param client Kubernetes client to query resources
   * @param anyNamespace whether to search across all namespaces
   * @param matchNames list of resource names to match
   * @return filtered or unfiltered list of ApplicationSpec instances
   */
  @Override
  public List<ApplicationSpec> getApplicationSpecs(
      KubernetesClient client, boolean anyNamespace, List<String> matchNames) {
    return getApplicationSpecs(client, anyNamespace, matchNames, null);
  }

  /**
   * Retrieves a list of ApplicationSpec objects for matching HTTPRoute resources with instance filtering.
   * If the wrapper is configured to only include annotated resources, filters the result accordingly.
   *
   * @param client Kubernetes client to query resources
   * @param anyNamespace whether to search across all namespaces
   * @param matchNames list of resource names to match
   * @param instanceFilter instance filter value, or null for no filtering
   * @return filtered or unfiltered list of ApplicationSpec instances
   */
  @Override
  public List<ApplicationSpec> getApplicationSpecs(
      KubernetesClient client, boolean anyNamespace, List<String> matchNames, String instanceFilter) {
    var applicationSpecs = super.getApplicationSpecs(client, anyNamespace, matchNames, instanceFilter);

    return onlyAnnotated ? filterEnabled(applicationSpecs) : applicationSpecs;
  }
}
