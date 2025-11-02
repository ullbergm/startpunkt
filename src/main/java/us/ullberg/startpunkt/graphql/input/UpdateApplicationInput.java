package us.ullberg.startpunkt.graphql.input;

import org.eclipse.microprofile.graphql.Description;
import org.eclipse.microprofile.graphql.Input;
import org.eclipse.microprofile.graphql.NonNull;

/**
 * GraphQL input type for updating an application.
 */
@Input("UpdateApplicationInput")
@Description("Input for updating an existing application")
public class UpdateApplicationInput {

  @NonNull
  @Description("Kubernetes namespace of the application")
  public String namespace;

  @NonNull
  @Description("Name of the application resource")
  public String resourceName;

  @NonNull
  @Description("Application name to display")
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
}
