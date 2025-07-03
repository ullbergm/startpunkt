package us.ullberg.startpunkt.objects.kubernetes;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import io.fabric8.kubernetes.client.KubernetesClient;
import java.util.List;
import us.ullberg.startpunkt.crd.ApplicationSpec;

/**
 * Wrapper for OpenShift Route custom resources to extract application information. Supports
 * filtering for only annotated routes if specified.
 */
public class RouteApplicationWrapper extends AnnotatedKubernetesObject {

  /** Indicates whether only annotated objects should be processed. */
  private final boolean onlyAnnotated;

  /**
   * Constructs a RouteApplicationWrapper for OpenShift Routes.
   *
   * @param onlyAnnotated if true, only annotated routes will be considered when extracting specs
   */
  public RouteApplicationWrapper(boolean onlyAnnotated) {
    super("route.openshift.io", "v1", "routes");
    this.onlyAnnotated = onlyAnnotated;
  }

  /**
   * Extracts the application URL from the Route's spec. Builds a URL using the protocol
   * (http/https), host, and path fields.
   *
   * @param item the Kubernetes resource representing the route
   * @return the constructed application URL
   */
  @Override
  protected String getAppUrl(GenericKubernetesResource item) {
    var spec = getSpec(item);

    String protocol = spec.containsKey("tls") ? "https://" : "http://";
    String host = spec.containsKey("host") ? spec.get("host").toString() : "localhost";
    String path = spec.containsKey("path") ? spec.get("path").toString() : "";

    return protocol + host + path;
  }

  /**
   * Retrieves a list of {@link ApplicationSpec} objects from OpenShift Route resources. Applies
   * filtering based on annotation settings.
   *
   * @param client the Kubernetes client
   * @param anyNamespace whether to search across all namespaces
   * @param matchNames a list of route names to match
   * @return a list of ApplicationSpec objects, possibly filtered to only annotated ones
   */
  @Override
  public List<ApplicationSpec> getApplicationSpecs(
      KubernetesClient client, boolean anyNamespace, List<String> matchNames) {
    var applicationSpecs = super.getApplicationSpecs(client, anyNamespace, matchNames);
    return onlyAnnotated ? filterEnabled(applicationSpecs) : applicationSpecs;
  }
}
