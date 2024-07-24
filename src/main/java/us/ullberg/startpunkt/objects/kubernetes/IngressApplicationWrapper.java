package us.ullberg.startpunkt.objects.kubernetes;

import java.util.List;

import io.fabric8.kubernetes.client.KubernetesClient;
import us.ullberg.startpunkt.crd.ApplicationSpec;

// Class representing a wrapper for Kubernetes Ingress objects
public class IngressApplicationWrapper extends AnnotatedKubernetesObject {

  // Field to indicate if only annotated objects should be processed
  private Boolean onlyAnnotated = false;

  // Constructor to initialize the IngressApplicationWrapper with specific group, version, and
  // plural kind
  // Also initializes the onlyAnnotated field
  public IngressApplicationWrapper(Boolean onlyAnnotated) {
    super("networking.k8s.io", "v1", "ingresses");
    this.onlyAnnotated = onlyAnnotated;
  }

  // Override method to get a list of ApplicationSpec objects
  @Override
  public List<ApplicationSpec> getApplicationSpecs(KubernetesClient client, Boolean anyNamespace,
      String[] matchNames) {
    // Get the application specs from the parent class
    var applicationSpecs = super.getApplicationSpecs(client, anyNamespace, matchNames);

    // If onlyAnnotated is true, filter the list to include only enabled applications
    if (Boolean.TRUE.equals(onlyAnnotated)) {
      return applicationSpecs.stream().filter(app -> app.getEnabled() != null && app.getEnabled())
          .toList();
    }

    // If onlyAnnotated is false, return the full list of application specs
    return applicationSpecs;
  }
}
