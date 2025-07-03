package us.ullberg.startpunkt.objects.kubernetes;

import java.util.List;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import io.fabric8.kubernetes.client.KubernetesClient;
import us.ullberg.startpunkt.crd.ApplicationSpec;

// Class representing a wrapper for OpenShift Route objects
public class RouteApplicationWrapper extends AnnotatedKubernetesObject {

  // Field to indicate if only annotated objects should be processed
  private final boolean onlyAnnotated;

  // Constructor to initialize the RouteApplicationWrapper with specific group, version, and plural
  // kind
  // Also initializes the onlyAnnotated field
  public RouteApplicationWrapper(boolean onlyAnnotated) {
    super("route.openshift.io", "v1", "routes");
    this.onlyAnnotated = onlyAnnotated;
  }

  // Override method to get the application URL from the route's spec
  @Override
  protected String getAppUrl(GenericKubernetesResource item) {
    var spec = getSpec(item);

    // Determine the protocol based on whether 'tls' is present in the spec
    String protocol = spec.containsKey("tls") ? "https://" : "http://";
    // Get the host from the spec, default to "localhost" if not present
    String host = spec.containsKey("host") ? spec.get("host").toString() : "localhost";
    // Get the path from the spec, default to an empty string if not present
    String path = spec.containsKey("path") ? spec.get("path").toString() : "";

    // Construct and return the full URL
    return protocol + host + path;
  }

  // Override method to get a list of ApplicationSpec objects
  @Override
  public List<ApplicationSpec> getApplicationSpecs(KubernetesClient client, boolean anyNamespace,
      List<String> matchNames) {
    // Get the application specs from the parent class
    var applicationSpecs = super.getApplicationSpecs(client, anyNamespace, matchNames);

    // If onlyAnnotated is true, filter the list to include only enabled applications
    return onlyAnnotated ? filterEnabled(applicationSpecs) : applicationSpecs;
  }
}
