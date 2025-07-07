package us.ullberg.startpunkt.objects.kubernetes;

import io.fabric8.kubernetes.client.KubernetesClient;
import java.util.List;
import us.ullberg.startpunkt.crd.ApplicationSpec;

/** Defines methods for Kubernetes resource wrappers that retrieve application specifications. */
public interface KubernetesObject {

  /**
   * Gets the API group of the Kubernetes resource.
   *
   * @return the API group string
   */
  String getGroup();

  /**
   * Gets the API version of the Kubernetes resource.
   *
   * @return the API version string
   */
  String getVersion();

  /**
   * Gets the plural kind name of the Kubernetes resource (e.g., "applications").
   *
   * @return the plural kind name
   */
  String getPluralKind();

  /**
   * Retrieves the list of {@link ApplicationSpec} from the Kubernetes cluster.
   *
   * @param client Kubernetes client instance
   * @param anyNamespace if true, search across all namespaces; otherwise use matchNames
   * @param matchNames list of namespaces to filter on, used only if anyNamespace is false
   * @return list of ApplicationSpec found
   */
  List<ApplicationSpec> getApplicationSpecs(
      KubernetesClient client, boolean anyNamespace, List<String> matchNames);

  /**
   * Retrieves the list of {@link ApplicationSpec} from the Kubernetes cluster with instance filtering.
   *
   * @param client Kubernetes client instance
   * @param anyNamespace if true, search across all namespaces; otherwise use matchNames
   * @param matchNames list of namespaces to filter on, used only if anyNamespace is false
   * @param instanceFilter instance filter value, or null for no filtering
   * @return list of ApplicationSpec found
   */
  List<ApplicationSpec> getApplicationSpecs(
      KubernetesClient client, boolean anyNamespace, List<String> matchNames, String instanceFilter);
}
