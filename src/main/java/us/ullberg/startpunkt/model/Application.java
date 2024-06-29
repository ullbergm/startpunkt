package us.ullberg.startpunkt.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.quarkus.runtime.annotations.RegisterForReflection;

// Application class
@JsonInclude(JsonInclude.Include.NON_EMPTY)
@RegisterForReflection(registerFullHierarchy = true)
public class Application implements Comparable<Application> {
  // Constructor
  public Application(
      String name,
      String group,
      String icon,
      String iconColor,
      String uRL,
      String info,
      Boolean targetBlank,
      int location,
      Boolean enable) {
    Name = name;
    Group = group;
    Icon = icon;
    IconColor = iconColor;
    URL = uRL;
    Info = info;
    TargetBlank = targetBlank;
    Location = location;
    Enable = enable;
  }

  // Private fields
  private String Name;
  private String Group;
  private String Icon;
  private String IconColor;
  private String URL;
  private String Info;
  private Boolean TargetBlank;
  private int Location;
  private Boolean Enable;

  // Getter methods with annotations
  @JsonProperty("name")
  public String getName() {
    return Name;
  }

  @JsonProperty("group")
  public String getGroup() {
    return Group;
  }

  @JsonProperty("icon")
  public String getIcon() {
    return Icon;
  }

  @JsonProperty("iconColor")
  public String getIconColor() {
    return IconColor;
  }

  @JsonProperty("url")
  public String getURL() {
    return URL;
  }

  @JsonProperty("info")
  public String getInfo() {
    return Info;
  }

  @JsonProperty("targetBlank")
  public Boolean getTargetBlank() {
    return TargetBlank;
  }

  @JsonProperty("location")
  public int getLocation() {
    return Location;
  }

  @JsonProperty("enable")
  public Boolean getEnable() {
    return Enable;
  }

  // Implement Comparable interface
  @Override
  public int compareTo(Application other) {
    // Compare by group
    int groupCompare = this.getGroup().compareTo(other.getGroup());
    if (groupCompare != 0) {
      return groupCompare;
    }

    // Compare by location
    int locationCompare = Integer.compare(this.getLocation(), other.getLocation());
    if (locationCompare != 0) {
      return locationCompare;
    }

    // Compare by name
    return this.getName().compareTo(other.getName());
  }

  // Comparator class for sorting applications
  public static class ApplicationComparator implements java.util.Comparator<Application> {
    @Override
    public int compare(Application a, Application b) {
      // Compare by group
      int groupCompare = a.getGroup().compareTo(b.getGroup());
      if (groupCompare != 0) {
        return groupCompare;
      }

      // Compare by location
      int locationCompare = Integer.compare(a.getLocation(), b.getLocation());
      if (locationCompare != 0) {
        return locationCompare;
      }

      // Compare by name
      return a.getName().compareTo(b.getName());
    }
  }
}
