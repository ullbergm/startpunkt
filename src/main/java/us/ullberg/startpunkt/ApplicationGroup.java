package us.ullberg.startpunkt;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.quarkus.runtime.annotations.RegisterForReflection;
import java.util.ArrayList;
import us.ullberg.startpunkt.crd.ApplicationSpec;

// Group class
@RegisterForReflection(registerFullHierarchy = true)
public class ApplicationGroup implements Comparable<ApplicationGroup> {
  // Constructor
  public ApplicationGroup(String name) {
    Name = name;
    Applications = new ArrayList<ApplicationSpec>();
  }

  public ApplicationGroup(String name, ArrayList<ApplicationSpec> applications) {
    Name = name;
    Applications = applications;
  }

  // Private fields
  private String Name;
  private ArrayList<ApplicationSpec> Applications;

  // Getter methods with annotations
  @JsonProperty("name")
  public String getName() {
    return Name;
  }

  @JsonProperty("applications")
  public ArrayList<ApplicationSpec> getApplications() {
    return Applications;
  }

  // Implement Comparable interface for sorting by name
  @Override
  public int compareTo(ApplicationGroup other) {
    return this.getName().compareTo(other.getName());
  }

  public void addApplication(ApplicationSpec app) {
    Applications.add(app);
  }
}
