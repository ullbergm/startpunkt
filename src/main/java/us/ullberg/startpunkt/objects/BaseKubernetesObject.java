package us.ullberg.startpunkt.objects;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import io.fabric8.kubernetes.api.model.GenericKubernetesResourceList;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.dsl.base.ResourceDefinitionContext;
import java.util.List;
import java.util.Map;
import us.ullberg.startpunkt.crd.ApplicationSpec;

public abstract class BaseKubernetesObject implements IKubernetesObject {
  private String group;
  private String version;
  private String pluralKind;

  public BaseKubernetesObject(String group, String version, String pluralKind) {
    this.group = group;
    this.version = version;
    this.pluralKind = pluralKind;
  }

  public String getGroup() {
    return group;
  }

  public String getVersion() {
    return version;
  }

  public String getPluralKind() {
    return pluralKind;
  }

  private ResourceDefinitionContext getResourceDefinitionContext() {
    ResourceDefinitionContext resourceDefinitionContext = new ResourceDefinitionContext.Builder()
        .withGroup(group).withVersion(version).withPlural(pluralKind).withNamespaced(true).build();
    return resourceDefinitionContext;
  }

  protected GenericKubernetesResourceList getGenericKubernetesResources(KubernetesClient client,
      Boolean anyNamespace, String[] matchNames) {
    ResourceDefinitionContext resourceDefinitionContext = getResourceDefinitionContext();

    if (anyNamespace) {
      return client.genericKubernetesResources(resourceDefinitionContext).inAnyNamespace().list();
    }

    // For each namespace, get the resource
    GenericKubernetesResourceList list = new GenericKubernetesResourceList();
    for (String namespace : matchNames) {
      list.getItems().addAll(client.genericKubernetesResources(resourceDefinitionContext)
          .inNamespace(namespace).list().getItems());
    }

    return list;
  }

  public List<ApplicationSpec> getApplicationSpecs(KubernetesClient client, Boolean anyNamespace,
      String[] matchNames) {
    return getGenericKubernetesResources(client, anyNamespace, matchNames).getItems().stream()
        .map(item -> {
          String name = getAppName(item);
          String group = getAppGroup(item);
          String url = getAppUrl(item);
          String icon = getAppIcon(item);
          String iconColor = getAppIconColor(item);
          String info = getAppInfo(item);
          Boolean targetBlank = getAppTargetBlank(item);
          int location = getAppLocation(item);
          Boolean enabled = getAppEnabled(item);

          return new ApplicationSpec(name, group, icon, iconColor, url, info, targetBlank, location,
              enabled);
        }).toList();
  }

  protected Map<String, String> getAnnotations(GenericKubernetesResource item) {
    return item.getMetadata().getAnnotations();
  }

  @SuppressWarnings("unchecked")
  protected Map<String, Object> getSpec(GenericKubernetesResource item) {
    return (Map<String, Object>) getProps(item).get("spec");
  }

  protected Map<String, Object> getProps(GenericKubernetesResource item) {
    return item.getAdditionalProperties();
  }

  protected String getAppName(GenericKubernetesResource item) {
    // Get the name of the object
    return item.getMetadata().getName().toLowerCase();
  }

  protected String getAppGroup(GenericKubernetesResource item) {
    // Get the namespace of the object
    return item.getMetadata().getNamespace().toLowerCase();
  }

  String getAppUrl(GenericKubernetesResource item) {
    return null;
  }

  protected String getAppIcon(GenericKubernetesResource item) {
    return null;
  }

  protected String getAppIconColor(GenericKubernetesResource item) {
    return null;
  }

  protected String getAppInfo(GenericKubernetesResource item) {
    return null;
  }

  protected Boolean getAppTargetBlank(GenericKubernetesResource item) {
    return null;
  }

  // Default location is 1000
  protected int getAppLocation(GenericKubernetesResource item) {
    return 1000;
  }

  protected Boolean getAppEnabled(GenericKubernetesResource item) {
    return null;
  }
}
