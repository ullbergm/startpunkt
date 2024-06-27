package us.ullberg.startpage.model;

import java.util.ArrayList;

import com.fasterxml.jackson.annotation.JsonProperty;

// Group class
public class ApplicationGroup implements Comparable<ApplicationGroup> {
    // Constructor
    public ApplicationGroup(String name) {
        Name = name;
        Applications = new ArrayList<Application>();
    }
    
    public ApplicationGroup(String name, ArrayList<Application> applications) {
        Name = name;
        Applications = applications;
    }
    
    // Private fields
    private String Name;
    private ArrayList<Application> Applications;

    // Getter methods with annotations
    @JsonProperty("name")
    public String getName() {
        return Name;
    }

    @JsonProperty("applications")
    public ArrayList<Application> getApplications() {
        return Applications;
    }

    // Implement Comparable interface for sorting by name
    @Override
    public int compareTo(ApplicationGroup other) {
        return this.getName().compareTo(other.getName());
    }

    public void addApplication(Application app) {
        Applications.add(app);
    }
}
