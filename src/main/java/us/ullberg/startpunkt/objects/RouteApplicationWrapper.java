package us.ullberg.startpunkt.objects;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import io.fabric8.kubernetes.client.KubernetesClient;
import java.util.List;
import us.ullberg.startpunkt.crd.ApplicationSpec;

public class RouteApplicationWrapper extends AnnotatedKubernetesObject {
  public RouteApplicationWrapper(Boolean onlyAnnotated) {
    super("route.openshift.io", "v1", "routes");
    this.onlyAnnotated = onlyAnnotated;
  }

  private Boolean onlyAnnotated = false;

  @Override
  protected String getAppUrl(GenericKubernetesResource item) {
    var spec = getSpec(item);

    String protocol = spec.containsKey("tls") ? "https://" : "http://";
    String host = spec.containsKey("host") ? spec.get("host").toString() : "localhost";
    String path = spec.containsKey("path") ? spec.get("path").toString() : "";

    return protocol + host + path;
  }

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
