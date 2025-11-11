package us.ullberg.startpunkt.objects;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.quarkus.runtime.annotations.RegisterForReflection;
import java.util.LinkedList;
import java.util.List;

/**
 * Represents a group of applications, each group identified by a name and containing a list of
 * {@link ApplicationResponse} objects.
 */
@RegisterForReflection(registerFullHierarchy = true)
public final class ApplicationGroup implements Comparable<ApplicationGroup> {

  private String name;
  private LinkedList<ApplicationResponse> applications;

  /** Default constructor for deserialization purposes. */
  public ApplicationGroup() {
    this.applications = new LinkedList<>();
  }

  /**
   * Constructs an ApplicationGroup with the given name and an empty list of applications.
   *
   * @param name the name of the application group, must not be null or blank
   * @throws IllegalArgumentException if name is null or blank
   */
  public ApplicationGroup(String name) {
    this(name, new LinkedList<>());
  }

  /**
   * Constructs an ApplicationGroup with the given name and list of applications.
   *
   * @param name the name of the application group, must not be null or blank
   * @param applications the list of applications; if null, initialized to an empty list
   * @throws IllegalArgumentException if name is null or blank
   */
  public ApplicationGroup(String name, List<ApplicationResponse> applications) {
    if (name == null || name.isBlank()) {
      throw new IllegalArgumentException("ApplicationGroup name cannot be null or empty");
    }
    this.name = name;
    this.applications = applications != null ? new LinkedList<>(applications) : new LinkedList<>();
  }

  /**
   * Returns the name of the application group.
   *
   * @return the group name
   */
  @JsonProperty("name")
  public String getName() {
    return name;
  }

  /**
   * Sets the name of the application group.
   *
   * @param name the new name
   */
  public void setName(String name) {
    this.name = name;
  }

  /**
   * Returns an unmodifiable copy of the applications list.
   *
   * @return list of applications in this group
   */
  @JsonProperty("applications")
  public List<ApplicationResponse> getApplications() {
    return List.copyOf(applications);
  }

  /**
   * Sets the list of applications in this group.
   *
   * @param applications the new list of applications; if null, resets to empty list
   */
  public void setApplications(List<ApplicationResponse> applications) {
    this.applications = applications != null ? new LinkedList<>(applications) : new LinkedList<>();
  }

  /**
   * Compares this ApplicationGroup to another by their name (case-insensitive).
   *
   * @param other the other ApplicationGroup to compare to
   * @return comparison result based on group name
   */
  @Override
  public int compareTo(ApplicationGroup other) {
    return this.getName().compareToIgnoreCase(other.getName());
  }

  @Override
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    }
    if (other == null || getClass() != other.getClass()) {
      return false;
    }
    ApplicationGroup otherGroup = (ApplicationGroup) other;
    return (name != null ? name.equalsIgnoreCase(otherGroup.name) : otherGroup.name == null)
        && (applications != null
            ? applications.equals(otherGroup.applications)
            : otherGroup.applications == null);
  }

  @Override
  public int hashCode() {
    // Use lowercase for case-insensitive hash consistency
    int result = name != null ? name.toLowerCase().hashCode() : 0;
    result = 31 * result + (applications != null ? applications.hashCode() : 0);
    return result;
  }

  /**
   * Adds an application to the group.
   *
   * @param app the application to add; must not be null
   * @throws IllegalArgumentException if app is null
   */
  public void addApplication(ApplicationResponse app) {
    if (app == null) {
      throw new IllegalArgumentException("Application cannot be null");
    }
    applications.add(app);
  }

  @Override
  public String toString() {
    return "ApplicationGroup{name='" + name + "', applications=" + applications + '}';
  }
}
