package us.ullberg.startpunkt.objects;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import io.fabric8.kubernetes.client.KubernetesClient;

import java.util.ArrayList;
import java.util.List;

import us.ullberg.startpunkt.crd.ApplicationSpec;

// Class representing a wrapper for Istio VirtualService objects
public class IstioVirtualServiceApplicationWrapper extends AnnotatedKubernetesObject {

  // Field to indicate if only annotated objects should be processed
  private Boolean onlyAnnotated = false;

  // Field to store the default protocol for the VirtualService
  private String defaultProtocol = "http";

  // Constructor to initialize the VirtualServiceApplicationWrapper with specific
  // group, version, and pluralkind
  public IstioVirtualServiceApplicationWrapper(Boolean onlyAnnotated, String defaultProtocol) {
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
        spec.containsKey("hosts") ? (ArrayList<String>) spec.get("hosts") : new ArrayList<String>();
    if (hosts.isEmpty()) {
      hosts.add("localhost");
    }

    // Construct and return the full URL
    return protocol + "://" + hosts.get(0);
  }

  // Override method to get a list of ApplicationSpec objects
  @Override
  public List<ApplicationSpec> getApplicationSpecs(KubernetesClient client, Boolean anyNamespace,
      String[] matchNames) {
    // Get the application specs from the parent class
    var applicationSpecs = super.getApplicationSpecs(client, anyNamespace, matchNames);

    // If onlyAnnotated is true, filter the list to include only enabled
    // applications
    if (onlyAnnotated) {
      return applicationSpecs.stream().filter(app -> app.getEnabled() != null && app.getEnabled())
          .toList();
    }

    // If onlyAnnotated is false, return the full list of application specs
    return applicationSpecs;
  }
}
