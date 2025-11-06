package us.ullberg.startpunkt.graphql.types;

import java.util.List;
import java.util.stream.Collectors;
import org.eclipse.microprofile.graphql.Description;
import org.eclipse.microprofile.graphql.Type;

/** GraphQL type for Application Group. Groups applications by name/namespace. */
@Type("ApplicationGroup")
@Description("A group of applications, organized by namespace or custom grouping")
public class ApplicationGroupType {

  @Description("Name of the application group")
  public String name;

  @Description("List of applications in this group")
  public List<ApplicationType> applications;

  /** Default constructor for GraphQL. */
  public ApplicationGroupType() {}

  /**
   * Constructor with name and applications.
   *
   * @param name group name
   * @param applications list of applications
   */
  public ApplicationGroupType(String name, List<ApplicationType> applications) {
    this.name = name;
    this.applications = applications;
  }

  /**
   * Creates an ApplicationGroupType from an ApplicationGroup.
   *
   * @param group the ApplicationGroup to convert
   * @return ApplicationGroupType
   */
  public static ApplicationGroupType fromApplicationGroup(
      us.ullberg.startpunkt.objects.ApplicationGroup group) {
    ApplicationGroupType type = new ApplicationGroupType();
    type.name = group.getName();
    type.applications =
        group.getApplications().stream()
            .map(
                app ->
                    ApplicationType.fromResponse(
                        (us.ullberg.startpunkt.objects.ApplicationResponse) app))
            .collect(Collectors.toList());
    return type;
  }
}
