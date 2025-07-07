package us.ullberg.startpunkt.objects.kubernetes;

import io.fabric8.kubernetes.client.KubernetesClient;
import java.util.List;
import us.ullberg.startpunkt.crd.v1alpha2.ApplicationSpec;

/**
 * Wrapper class for Kubernetes Ingress resources. Allows retrieval of application specifications
 * from Ingresses, optionally filtering only annotated resources.
 */
public class IngressApplicationWrapper extends AnnotatedKubernetesObject {

  // Field to indicate if only annotated objects should be processed
  private final boolean onlyAnnotated;

  /**
   * Constructs an IngressApplicationWrapper.
   *
   * @param onlyAnnotated if true, only annotated Ingress resources will be processed
   */
  public IngressApplicationWrapper(boolean onlyAnnotated) {
    super("networking.k8s.io", "v1", "ingresses");
    this.onlyAnnotated = onlyAnnotated;
  }

  /**
   * Retrieves application specs from Kubernetes Ingress resources, filtering them based on the
   * onlyAnnotated flag.
   *
   * @param client Kubernetes client instance
   * @param anyNamespace whether to search across all namespaces
   * @param matchNames specific namespaces to include in the search
   * @return list of {@link ApplicationSpec} extracted from Ingress resources
   */
  @Override
  public List<ApplicationSpec> getApplicationSpecs(
      KubernetesClient client, boolean anyNamespace, List<String> matchNames) {
    // Get the application specs from the parent class
    var applicationSpecs = super.getApplicationSpecs(client, anyNamespace, matchNames);

    // If onlyAnnotated is true, filter the list to include only enabled applications
    if (onlyAnnotated) {
      return filterEnabled(applicationSpecs);
    }

    // If onlyAnnotated is false, return the full list of application specs
    return applicationSpecs;
  }
}
