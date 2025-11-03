package us.ullberg.startpunkt.graphql.input;

import org.eclipse.microprofile.graphql.Description;
import org.eclipse.microprofile.graphql.Input;
import org.eclipse.microprofile.graphql.NonNull;

/** GraphQL input type for updating a bookmark. */
@Input("UpdateBookmarkInput")
@Description("Input for updating an existing bookmark")
public class UpdateBookmarkInput {

  @NonNull
  @Description("Kubernetes namespace of the bookmark")
  public String namespace;

  @NonNull
  @Description("Name of the bookmark resource")
  public String name;

  @NonNull
  @Description("Bookmark name to display")
  public String bookmarkName;

  @NonNull
  @Description("Group the bookmark belongs to")
  public String group;

  @Description("Bookmark icon, e.g. 'mdi:home'")
  public String icon;

  @NonNull
  @Description("Bookmark URL")
  public String url;

  @Description("Description of the bookmark")
  public String info;

  @Description("Open the URL in a new tab")
  public Boolean targetBlank;

  @Description("Sorting order of the bookmark")
  public Integer location;
}
