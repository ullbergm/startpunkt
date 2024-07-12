package us.ullberg.startpunkt.objects;

import io.fabric8.kubernetes.client.KubernetesClient;
import java.util.List;
import us.ullberg.startpunkt.crd.ApplicationSpec;

public class IngressApplicationWrapper extends AnnotatedKubernetesObject {
  public IngressApplicationWrapper(Boolean onlyAnnotated) {
    super("networking.k8s.io", "v1", "ingresses");
    this.onlyAnnotated = onlyAnnotated;
  }

  private Boolean onlyAnnotated = false;

  @Override
  public List<ApplicationSpec> getApplicationSpecs(KubernetesClient client, Boolean anyNamespace,
      String[] matchNames) {
    // get the value from the parent class
    var applicationSpecs = super.getApplicationSpecs(client, anyNamespace, matchNames);

    if (onlyAnnotated) {
      return applicationSpecs.stream().filter(app -> app.getEnabled() != null && app.getEnabled())
          .toList();
    }

    return applicationSpecs;
  }
}
