package us.ullberg.startpunkt.graphql.types;

import org.eclipse.microprofile.graphql.Description;
import org.eclipse.microprofile.graphql.Type;

/** GraphQL type for Bookmark data. This is a pure DTO that does not extend from CRD classes. */
@Type("Bookmark")
@Description("Bookmark with Kubernetes metadata")
public class BookmarkType {

  @Description("Bookmark name")
  public String name;

  @Description("Group the bookmark belongs to")
  public String group;

  @Description("Bookmark icon, e.g. 'mdi:home'")
  public String icon;

  @Description("Bookmark URL")
  public String url;

  @Description("Description of the bookmark")
  public String info;

  @Description("Open the URL in a new tab")
  public Boolean targetBlank;

  @Description("Sorting order of the bookmark")
  public Integer location;

  @Description("Kubernetes namespace of the resource")
  public String namespace;

  @Description("Kubernetes resource name (metadata.name)")
  public String resourceName;

  @Description("Whether the resource is managed by another resource")
  public Boolean hasOwnerReferences;

  @Description("Cluster name this bookmark belongs to")
  public String cluster;

  /** Default constructor for GraphQL. */
  public BookmarkType() {}

  /**
   * Creates a BookmarkType from a BookmarkResponse.
   *
   * @param response the BookmarkResponse to convert
   * @return BookmarkType
   */
  public static BookmarkType fromResponse(us.ullberg.startpunkt.objects.BookmarkResponse response) {
    BookmarkType type = new BookmarkType();
    type.name = response.getName();
    type.group = response.getGroup();
    type.icon = response.getIcon();
    type.url = response.getUrl();
    type.info = response.getInfo();
    type.targetBlank = response.getTargetBlank();
    type.location = response.getLocation();
    type.namespace = response.getNamespace();
    type.resourceName = response.getResourceName();
    type.hasOwnerReferences = response.getHasOwnerReferences();
    type.cluster = response.getCluster();
    return type;
  }
}
