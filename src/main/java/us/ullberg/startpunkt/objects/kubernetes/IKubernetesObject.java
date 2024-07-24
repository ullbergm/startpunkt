package us.ullberg.startpunkt.objects.kubernetes;

import java.util.List;

import io.fabric8.kubernetes.client.KubernetesClient;
import us.ullberg.startpunkt.crd.ApplicationSpec;

// Interface defining methods for Kubernetes objects
interface IKubernetesObject {

  // Method to get the group of the Kubernetes resource
  String getGroup();

  // Method to get the version of the Kubernetes resource
  String getVersion();

  // Method to get the plural kind of the Kubernetes resource
  String getPluralKind();

  // Method to get a list of ApplicationSpec objects
  // client: Kubernetes client to interact with the cluster
  // anyNamespace: Boolean to specify whether to search in all namespaces
  // matchNames: Array of namespace names to search in if anyNamespace is false
  List<ApplicationSpec> getApplicationSpecs(KubernetesClient client, Boolean anyNamespace,
      String[] matchNames);
}
