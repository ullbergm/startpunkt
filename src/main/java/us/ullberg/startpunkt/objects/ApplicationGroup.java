package us.ullberg.startpunkt.objects;

import java.util.LinkedList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import io.quarkus.runtime.annotations.RegisterForReflection;
import us.ullberg.startpunkt.crd.ApplicationSpec;

// Class representing a group of applications
@RegisterForReflection(registerFullHierarchy = true)
public final class ApplicationGroup implements Comparable<ApplicationGroup> {

  // Private fields
  private String name;
  private LinkedList<ApplicationSpec> applications;

  // For deserialization
  public ApplicationGroup() {
    this.applications = new LinkedList<>();
  }

  // Constructor to initialize the ApplicationGroup with a name
  public ApplicationGroup(String name) {
    this(name, new LinkedList<>());
  }

  // Constructor to initialize the ApplicationGroup with a name and a list of
  // applications
  public ApplicationGroup(String name, List<ApplicationSpec> applications) {
    if (name == null || name.isBlank()) {
      throw new IllegalArgumentException("ApplicationGroup name cannot be null or empty");
    }
    this.name = name;
    this.applications = applications != null ? new LinkedList<>(applications) : new LinkedList<>();
  }

  // Getter method for the name field with JSON property annotation
  @JsonProperty("name")
  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  // Getter method for the applications field with JSON property annotation
  @JsonProperty("applications")
  public List<ApplicationSpec> getApplications() {
    return List.copyOf(applications);
  }

  public void setApplications(List<ApplicationSpec> applications) {
    this.applications = applications != null ? new LinkedList<>(applications) : new LinkedList<>();
  }

  // Override compareTo method to compare ApplicationGroup objects by name
  @Override
  public int compareTo(ApplicationGroup other) {
    return this.getName().compareTo(other.getName());
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
    return (name != null ? name.equals(otherGroup.name) : otherGroup.name == null)
        && (applications != null ? applications.equals(otherGroup.applications)
            : otherGroup.applications == null);
  }

  @Override
  public int hashCode() {
    int result = name != null ? name.hashCode() : 0;
    result = 31 * result + (applications != null ? applications.hashCode() : 0);
    return result;
  }

  // Method to add an application to the applications list
  public void addApplication(ApplicationSpec app) {
    if (app == null)
      throw new IllegalArgumentException("Application cannot be null");
    applications.add(app);
  }

  @Override
  public String toString() {
    return "ApplicationGroup{name='" + name + "', applications=" + applications + '}';
  }
}
