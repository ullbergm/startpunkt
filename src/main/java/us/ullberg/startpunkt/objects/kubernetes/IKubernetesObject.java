package us.ullberg.startpunkt.objects.kubernetes;

import java.util.List;

import io.fabric8.kubernetes.client.KubernetesClient;
import us.ullberg.startpunkt.crd.ApplicationSpec;

// Interface defining methods for Kubernetes objects
interface IKubernetesObject {
  /**
   * @return the API group of the Kubernetes resource.
   */
  String getGroup();

  /**
   * @return the API version of the Kubernetes resource.
   */
  String getVersion();

  /**
   * @return the plural kind name of the Kubernetes resource (e.g., "applications").
   */
  String getPluralKind();

  /**
   * Retrieves the ApplicationSpec instances from the cluster.
   *
   * @param client Kubernetes client instance
   * @param anyNamespace if true, search all namespaces; otherwise use matchNames
   * @param matchNames list of namespace names to filter by (used only if anyNamespace is false)
   * @return list of ApplicationSpec objects found
   */
  List<ApplicationSpec> getApplicationSpecs(KubernetesClient client, boolean anyNamespace,
      List<String> matchNames);
}
