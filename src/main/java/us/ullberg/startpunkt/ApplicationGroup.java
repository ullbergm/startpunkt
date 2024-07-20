package us.ullberg.startpunkt;

import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import io.quarkus.runtime.annotations.RegisterForReflection;
import us.ullberg.startpunkt.crd.ApplicationSpec;

// Class representing a group of applications
@RegisterForReflection(registerFullHierarchy = true)
public class ApplicationGroup implements Comparable<ApplicationGroup> {

  // Private fields
  private String name;
  private LinkedList<ApplicationSpec> applications;

  // Constructor to initialize the ApplicationGroup with a name
  public ApplicationGroup(String name) {
    this.name = name;
    applications = new LinkedList<>();
  }

  // Constructor to initialize the ApplicationGroup with a name and a list of
  // applications
  public ApplicationGroup(String name, List<ApplicationSpec> applications) {
    this.name = name;
    this.applications = (LinkedList<ApplicationSpec>) applications;
  }

  // Getter method for the name field with JSON property annotation
  @JsonProperty("name")
  public String getName() {
    return name;
  }

  // Getter method for the applications field with JSON property annotation
  @JsonProperty("applications")
  public List<ApplicationSpec> getApplications() {
    return applications;
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
    applications.add(app);
  }
}
