package us.ullberg.startpunkt.crd;

import io.fabric8.kubernetes.api.model.DefaultKubernetesResourceList;

/**
 * Represents a list of {@link Application} custom resources. Extends DefaultKubernetesResourceList
 * to provide type safety for collections of Application objects.
 */
public class ApplicationList extends DefaultKubernetesResourceList<Application> {
  // No additional fields or methods are defined,
  // this class simply serves as a type-safe list for Application custom resources

  /**
   * Creates an empty ApplicationList. Required to suppress warnings about the implicit default
   * constructor.
   */
  public ApplicationList() {
    super();
  }
}
