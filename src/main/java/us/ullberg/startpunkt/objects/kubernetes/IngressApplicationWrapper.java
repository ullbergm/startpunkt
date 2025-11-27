package us.ullberg.startpunkt.objects.kubernetes;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import io.fabric8.kubernetes.api.model.GenericKubernetesResourceList;
import io.fabric8.kubernetes.client.KubernetesClient;
import java.util.List;
import java.util.Map;
import us.ullberg.startpunkt.crd.v1alpha4.ApplicationSpec;

/**
 * Wrapper class for Kubernetes Ingress resources. Allows retrieval of application specifications
 * from Ingresses, optionally filtering only annotated resources and by ingress class name.
 */
public class IngressApplicationWrapper extends AnnotatedKubernetesObject {

  // Field to indicate if only annotated objects should be processed
  private final boolean onlyAnnotated;

  // List of ingress class names to filter by (empty means no filtering)
  private final List<String> ingressClassNames;

  // Whether to include ingresses without an ingressClassName when filtering is enabled
  private final boolean includeUnclassified;

  /**
   * Constructs an IngressApplicationWrapper.
   *
   * @param onlyAnnotated if true, only annotated Ingress resources will be processed
   */
  public IngressApplicationWrapper(boolean onlyAnnotated) {
    this(onlyAnnotated, List.of(), true);
  }

  /**
   * Constructs an IngressApplicationWrapper with ingress class filtering.
   *
   * @param onlyAnnotated if true, only annotated Ingress resources will be processed
   * @param ingressClassNames list of ingress class names to filter by (empty = no filtering)
   * @param includeUnclassified if true, include ingresses without ingressClassName when filtering
   */
  public IngressApplicationWrapper(
      boolean onlyAnnotated, List<String> ingressClassNames, boolean includeUnclassified) {
    super("networking.k8s.io", "v1", "ingresses");
    this.onlyAnnotated = onlyAnnotated;
    this.ingressClassNames = ingressClassNames != null ? ingressClassNames : List.of();
    this.includeUnclassified = includeUnclassified;
  }

  /**
   * Retrieves generic Kubernetes Ingress resources, filtering by ingress class if configured.
   *
   * @param client the Kubernetes client instance
   * @param anyNamespace if true, searches across all namespaces
   * @param matchNames list of namespace names to filter on
   * @return filtered list of GenericKubernetesResource objects
   */
  @Override
  protected GenericKubernetesResourceList getGenericKubernetesResources(
      KubernetesClient client, boolean anyNamespace, List<String> matchNames) {
    GenericKubernetesResourceList resources =
        super.getGenericKubernetesResources(client, anyNamespace, matchNames);

    // If no ingress class filter is configured, return all resources
    if (ingressClassNames.isEmpty()) {
      return resources;
    }

    // Filter resources by ingress class name
    List<GenericKubernetesResource> filteredItems =
        resources.getItems().stream().filter(this::matchesIngressClass).toList();

    GenericKubernetesResourceList filteredList = new GenericKubernetesResourceList();
    filteredList.setItems(filteredItems);
    return filteredList;
  }

  /**
   * Checks if an Ingress resource matches the configured ingress class filter.
   *
   * @param item the Ingress resource to check
   * @return true if the ingress matches the filter criteria
   */
  private boolean matchesIngressClass(GenericKubernetesResource item) {
    String ingressClassName = getIngressClassName(item);

    // If the ingress has no class name
    if (ingressClassName == null || ingressClassName.isEmpty()) {
      // Include it only if includeUnclassified is true
      return includeUnclassified;
    }

    // Check if the ingress class name matches any of the configured class names (exact match)
    return ingressClassNames.contains(ingressClassName);
  }

  /**
   * Extracts the ingressClassName from an Ingress resource's spec.
   *
   * @param item the Ingress resource
   * @return the ingressClassName or null if not set
   */
  private String getIngressClassName(GenericKubernetesResource item) {
    Map<String, Object> spec = getSpec(item);
    if (spec == null) {
      return null;
    }
    Object className = spec.get("ingressClassName");
    return className != null ? className.toString() : null;
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
    // Get the application specs from the parent class (which now uses our filtered resources)
    var applicationSpecs = super.getApplicationSpecs(client, anyNamespace, matchNames);

    // If onlyAnnotated is true, filter the list to include only enabled applications
    if (onlyAnnotated) {
      return filterEnabled(applicationSpecs);
    }

    // If onlyAnnotated is false, return the full list of application specs
    return applicationSpecs;
  }

  /**
   * Retrieves application specs with metadata from Kubernetes Ingress resources, filtering them
   * based on the onlyAnnotated flag.
   *
   * @param client Kubernetes client instance
   * @param anyNamespace whether to search across all namespaces
   * @param matchNames specific namespaces to include in the search
   * @return list of {@link us.ullberg.startpunkt.objects.ApplicationResponse} extracted from
   *     Ingress resources with metadata
   */
  @Override
  public List<us.ullberg.startpunkt.objects.ApplicationResponse> getApplicationSpecsWithMetadata(
      KubernetesClient client, boolean anyNamespace, List<String> matchNames) {
    // Get the application specs with metadata from the parent class
    var applicationSpecs = super.getApplicationSpecsWithMetadata(client, anyNamespace, matchNames);

    // If onlyAnnotated is true, filter the list to include only enabled applications
    if (onlyAnnotated) {
      return filterEnabledWithMetadata(applicationSpecs);
    }

    // If onlyAnnotated is false, return the full list of application specs
    return applicationSpecs;
  }

  /**
   * Retrieves application specs with metadata from Kubernetes Ingress resources with cluster name,
   * filtering them based on the onlyAnnotated flag.
   *
   * @param client Kubernetes client instance
   * @param anyNamespace whether to search across all namespaces
   * @param matchNames specific namespaces to include in the search
   * @param clusterName the name of the cluster these resources belong to
   * @return list of {@link us.ullberg.startpunkt.objects.ApplicationResponse} extracted from
   *     Ingress resources with metadata
   */
  @Override
  public List<us.ullberg.startpunkt.objects.ApplicationResponse> getApplicationSpecsWithMetadata(
      KubernetesClient client, boolean anyNamespace, List<String> matchNames, String clusterName) {
    // Get the application specs with metadata from the parent class
    var applicationSpecs =
        super.getApplicationSpecsWithMetadata(client, anyNamespace, matchNames, clusterName);

    // If onlyAnnotated is true, filter the list to include only enabled applications
    if (onlyAnnotated) {
      return filterEnabledWithMetadata(applicationSpecs);
    }

    // If onlyAnnotated is false, return the full list of application specs
    return applicationSpecs;
  }
}
