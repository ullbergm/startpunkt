package us.ullberg.startpunkt.objects.kubernetes;

import java.util.ArrayList;
import java.util.List;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import io.fabric8.kubernetes.client.KubernetesClient;
import us.ullberg.startpunkt.crd.ApplicationSpec;

// Class representing a wrapper for Istio VirtualService objects
public class IstioVirtualServiceApplicationWrapper extends AnnotatedKubernetesObject {

  // Field to indicate if only annotated objects should be processed
  private final boolean onlyAnnotated;

  // Field to store the default protocol for the VirtualService
  private final String defaultProtocol;

  // Constructor to initialize the VirtualServiceApplicationWrapper with specific
  // group, version, and pluralkind
  public IstioVirtualServiceApplicationWrapper(boolean onlyAnnotated, String defaultProtocol) {
    super("networking.istio.io", "v1", "virtualservices");
    this.onlyAnnotated = onlyAnnotated;
    this.defaultProtocol = defaultProtocol;
  }

  // Override method to get the application URL from the VirtualService's spec
  @Override
  protected String getAppUrl(GenericKubernetesResource item) {
    var spec = getSpec(item);

    // Determine the protocol based on the spec
    String protocol = getAppProtocol(item);
    if (protocol == null) {
      protocol = defaultProtocol;
    }

    // Get the host from the spec, default to "localhost" if not present
    @SuppressWarnings("unchecked")
    ArrayList<String> hosts =
        spec.containsKey("hosts") ? (ArrayList<String>) spec.get("hosts") : new ArrayList<>();
    if (hosts.isEmpty()) {
      hosts.add("localhost");
    }

    // Construct and return the full URL
    return protocol + "://" + hosts.get(0);
  }

  // Override method to get a list of ApplicationSpec objects
  @Override
  public List<ApplicationSpec> getApplicationSpecs(KubernetesClient client, boolean anyNamespace,
      List<String> matchNames) {
    // Get the application specs from the parent class
    var applicationSpecs = super.getApplicationSpecs(client, anyNamespace, matchNames);

    // If onlyAnnotated is true, filter the list to include only enabled
    // applications
    return onlyAnnotated ? filterEnabled(applicationSpecs) : applicationSpecs;
  }
}
