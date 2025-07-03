package us.ullberg.startpunkt.objects.kubernetes;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import io.fabric8.kubernetes.client.KubernetesClient;
import java.util.ArrayList;
import java.util.List;
import us.ullberg.startpunkt.crd.ApplicationSpec;

/**
 * Wrapper for Istio VirtualService custom resources to extract application info. Supports filtering
 * to only annotated VirtualServices if specified.
 */
public class IstioVirtualServiceApplicationWrapper extends AnnotatedKubernetesObject {

  // Field to indicate if only annotated objects should be processed
  private final boolean onlyAnnotated;

  // Field to store the default protocol for the VirtualService
  private final String defaultProtocol;

  /**
   * Constructs an IstioVirtualServiceApplicationWrapper.
   *
   * @param onlyAnnotated if true, only annotated VirtualServices will be processed
   * @param defaultProtocol default protocol to use if not specified in the resource
   */
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
  public List<ApplicationSpec> getApplicationSpecs(
      KubernetesClient client, boolean anyNamespace, List<String> matchNames) {
    // Get the application specs from the parent class
    var applicationSpecs = super.getApplicationSpecs(client, anyNamespace, matchNames);

    // If onlyAnnotated is true, filter the list to include only enabled
    // applications
    return onlyAnnotated ? filterEnabled(applicationSpecs) : applicationSpecs;
  }
}
