package us.ullberg.startpunkt.objects.kubernetes;

import java.util.List;
import java.util.Map;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import io.fabric8.kubernetes.api.model.GenericKubernetesResourceList;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.dsl.base.ResourceDefinitionContext;
import jakarta.annotation.Nullable;
import us.ullberg.startpunkt.crd.ApplicationSpec;

// Abstract base class representing a Kubernetes object
public abstract class BaseKubernetesObject implements IKubernetesObject {
  private String group;
  private String version;
  private String pluralKind;

  // Constructor to initialize the custom resource with specified values
  protected BaseKubernetesObject(String group, String version, String pluralKind) {
    this.group = group;
    this.version = version;
    this.pluralKind = pluralKind;
  }

  // Getters for the group, version, and plural kind
  public String getGroup() {
    return group;
  }

  public String getVersion() {
    return version;
  }

  public String getPluralKind() {
    return pluralKind;
  }

  // Method to create a ResourceDefinitionContext for the custom resource
  private ResourceDefinitionContext getResourceDefinitionContext() {
    return new ResourceDefinitionContext.Builder().withGroup(group).withVersion(version)
        .withPlural(pluralKind).withNamespaced(true).build();
  }

  // Method to get a list of GenericKubernetesResource objects
  protected GenericKubernetesResourceList getGenericKubernetesResources(KubernetesClient client,
      boolean anyNamespace, List<String> matchNames) {
    ResourceDefinitionContext resourceDefinitionContext = getResourceDefinitionContext();

    try {
      // If anyNamespace is true, list resources in all namespaces
      if (anyNamespace) {
        return client.genericKubernetesResources(resourceDefinitionContext).inAnyNamespace().list();
      }

      // For each specified namespace, get the resources
      GenericKubernetesResourceList list = new GenericKubernetesResourceList();
      for (String namespace : matchNames) {
        list.getItems().addAll(client.genericKubernetesResources(resourceDefinitionContext)
            .inNamespace(namespace).list().getItems());
      }

      return list;
    } catch (Exception ex) {
      // Return an empty list if we fail to retrieve the objects, this should probably change to be
      // a proactive startup check instead.
      return new GenericKubernetesResourceList();
    }
  }

  // Method to get a list of ApplicationSpec objects
  public List<ApplicationSpec> getApplicationSpecs(KubernetesClient client, boolean anyNamespace,
      List<String> matchNames) {
    return getGenericKubernetesResources(client, anyNamespace, matchNames).getItems().stream()
        .map(this::mapToApplicationSpec).toList();
  }

  protected ApplicationSpec mapToApplicationSpec(GenericKubernetesResource item) {
    return new ApplicationSpec(getAppName(item), getAppGroup(item), getAppIcon(item),
        getAppIconColor(item), getAppUrl(item), getAppInfo(item), getAppTargetBlank(item),
        getAppLocation(item), getAppEnabled(item));
  }

  // Method to get annotations from a GenericKubernetesResource object
  protected Map<String, String> getAnnotations(GenericKubernetesResource item) {
    return item.getMetadata().getAnnotations();
  }

  // Method to get the spec from a GenericKubernetesResource object
  @SuppressWarnings("unchecked")
  protected Map<String, Object> getSpec(GenericKubernetesResource item) {
    return (Map<String, Object>) getProps(item).get("spec");
  }

  // Method to get additional properties from a GenericKubernetesResource object
  protected Map<String, Object> getProps(GenericKubernetesResource item) {
    return item.getAdditionalProperties();
  }

  // Method to get the application name from a GenericKubernetesResource object
  protected String getAppName(GenericKubernetesResource item) {
    // Get the name of the object
    return item.getMetadata().getName().toLowerCase();
  }

  // Method to get the application group from a GenericKubernetesResource object
  protected String getAppGroup(GenericKubernetesResource item) {
    // Get the namespace of the object
    return item.getMetadata().getNamespace().toLowerCase();
  }

  // Default method to get the application URL from a GenericKubernetesResource
  // object
  /**
   * @param item This GenericKubernetesResource object is used in overriding classes
   * @return
   */
  protected String getAppUrl(GenericKubernetesResource item) {
    return null;
  }

  // Default method to get the application icon from a GenericKubernetesResource
  // object
  /**
   * @param item This GenericKubernetesResource object is used in overriding classes
   * @return
   */
  protected String getAppIcon(GenericKubernetesResource item) {
    return null;
  }

  // Default method to get the application icon color from a
  // GenericKubernetesResource object
  /**
   * @param item This GenericKubernetesResource object is used in overriding classes
   * @return
   */
  protected String getAppIconColor(GenericKubernetesResource item) {
    return null;
  }

  // Default method to get the application info from a GenericKubernetesResource
  // object
  /**
   * @param item This GenericKubernetesResource object is used in overriding classes
   * @return
   */
  protected String getAppInfo(GenericKubernetesResource item) {
    return null;
  }

  // Default method to check if the application URL should open in a new tab
  @Nullable
  /**
   * @param item This GenericKubernetesResource object is used in overriding classes
   * @return
   */
  protected Boolean getAppTargetBlank(GenericKubernetesResource item) {
    return false;
  }

  // Method to get the application location from a GenericKubernetesResource
  // object
  // Default location is 1000
  /**
   * @param item This GenericKubernetesResource object is used in overriding classes
   * @return
   */
  protected int getAppLocation(GenericKubernetesResource item) {
    return 1000;
  }

  // Default method to check if the application is enabled
  /**
   * @param item This GenericKubernetesResource object is used in overriding classes
   * @return
   */
  @Nullable
  protected Boolean getAppEnabled(GenericKubernetesResource item) {
    return false;
  }

  // Default method to get the application protocol from a
  // GenericKubernetesResource object
  /**
   * @param item This GenericKubernetesResource object is used in overriding classes
   * @return
   */
  protected String getAppProtocol(GenericKubernetesResource item) {
    return null;
  }

  protected String getOptionalSpecString(GenericKubernetesResource item, String key,
      String fallback) {
    var spec = getSpec(item);
    return spec.containsKey(key) ? spec.get(key).toString() : fallback;
  }

  protected Boolean getOptionalSpecBoolean(GenericKubernetesResource item, String key,
      Boolean fallback) {
    var spec = getSpec(item);
    return spec.containsKey(key) ? Boolean.parseBoolean(spec.get(key).toString()) : fallback;
  }

  protected Integer getOptionalSpecInteger(GenericKubernetesResource item, String key,
      Integer fallback) {
    var spec = getSpec(item);
    return spec.containsKey(key) ? Integer.parseInt(spec.get(key).toString()) : fallback;
  }
}
