package us.ullberg.startpunkt.graphql.types;

import org.eclipse.microprofile.graphql.Description;
import org.eclipse.microprofile.graphql.Type;

/** GraphQL type for Application data. This is a pure DTO that does not extend from CRD classes. */
@Type("Application")
@Description("Application with runtime availability status and Kubernetes metadata")
public class ApplicationType {

  @Description("Application name")
  public String name;

  @Description("Group the application belongs to")
  public String group;

  @Description("Application icon, e.g. 'mdi:home'")
  public String icon;

  @Description("Application icon color, e.g. '#FF0000'")
  public String iconColor;

  @Description("Application URL")
  public String url;

  @Description("Description of the application")
  public String info;

  @Description("Open the URL in a new tab")
  public Boolean targetBlank;

  @Description("Sorting order of the application")
  public Integer location;

  @Description("Enable the application")
  public Boolean enabled;

  @Description("Root path to append to the URL")
  public String rootPath;

  @Description("Comma-separated tags for filtering applications")
  public String tags;

  @Description("Whether the application is currently reachable")
  public Boolean available;

  @Description("Kubernetes namespace of the resource")
  public String namespace;

  @Description("Kubernetes resource name (metadata.name)")
  public String resourceName;

  @Description("Whether the resource is managed by another resource")
  public Boolean hasOwnerReferences;

  /** Default constructor for GraphQL. */
  public ApplicationType() {}

  /**
   * Creates an ApplicationType from an ApplicationResponse.
   *
   * @param response the ApplicationResponse to convert
   * @return ApplicationType
   */
  public static ApplicationType fromResponse(
      us.ullberg.startpunkt.objects.ApplicationResponse response) {
    ApplicationType type = new ApplicationType();
    type.name = response.getName();
    type.group = response.getGroup();
    type.icon = response.getIcon();
    type.iconColor = response.getIconColor();
    type.url = response.getUrl();
    type.info = response.getInfo();
    type.targetBlank = response.getTargetBlank();
    type.location = response.getLocation();
    type.enabled = response.getEnabled();
    type.rootPath = response.getRootPath();
    type.tags = response.getTags();
    type.available = response.getAvailable();
    type.namespace = response.getNamespace();
    type.resourceName = response.getResourceName();
    type.hasOwnerReferences = response.getHasOwnerReferences();
    return type;
  }
}
