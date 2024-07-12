package us.ullberg.startpunkt.crd;

import io.fabric8.kubernetes.api.model.DefaultKubernetesResourceList;

// ApplicationList class extends DefaultKubernetesResourceList with Application as the type
// parameter
public class ApplicationList extends DefaultKubernetesResourceList<Application> {
  // No additional fields or methods are defined,
  // this class simply serves as a type-safe list for Application custom resources
}
