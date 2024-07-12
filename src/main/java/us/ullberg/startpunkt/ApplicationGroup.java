package us.ullberg.startpunkt;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.quarkus.runtime.annotations.RegisterForReflection;
import java.util.ArrayList;
import us.ullberg.startpunkt.crd.ApplicationSpec;

// Class representing a group of applications
@RegisterForReflection(registerFullHierarchy = true)
public class ApplicationGroup implements Comparable<ApplicationGroup> {

  // Private fields
  private String Name;
  private ArrayList<ApplicationSpec> Applications;

  // Constructor to initialize the ApplicationGroup with a name
  public ApplicationGroup(String name) {
    Name = name;
    Applications = new ArrayList<ApplicationSpec>();
  }

  // Constructor to initialize the ApplicationGroup with a name and a list of applications
  public ApplicationGroup(String name, ArrayList<ApplicationSpec> applications) {
    Name = name;
    Applications = applications;
  }

  // Getter method for the name field with JSON property annotation
  @JsonProperty("name")
  public String getName() {
    return Name;
  }

  // Getter method for the applications field with JSON property annotation
  @JsonProperty("applications")
  public ArrayList<ApplicationSpec> getApplications() {
    return Applications;
  }

  // Override compareTo method to compare ApplicationGroup objects by name
  @Override
  public int compareTo(ApplicationGroup other) {
    return this.getName().compareTo(other.getName());
  }

  // Method to add an application to the applications list
  public void addApplication(ApplicationSpec app) {
    Applications.add(app);
  }
}
