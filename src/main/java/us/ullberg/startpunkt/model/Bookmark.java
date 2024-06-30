package us.ullberg.startpunkt.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.quarkus.runtime.annotations.RegisterForReflection;

// Bookmark class
@JsonInclude(JsonInclude.Include.NON_EMPTY)
@RegisterForReflection(registerFullHierarchy = true)
public class Bookmark implements Comparable<Bookmark> {
  // Constructor
  public Bookmark(
      String name,
      String group,
      String icon,
      String uRL,
      String info,
      Boolean targetBlank,
      int location) {
    Name = name;
    Group = group;
    Icon = icon;
    URL = uRL;
    Info = info;
    TargetBlank = targetBlank;
    Location = location;
  }

  // Private fields
  private String Name;
  private String Group;
  private String Icon;
  private String URL;
  private String Info;
  private Boolean TargetBlank;
  private int Location;

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

  // Implement Comparable interface
  @Override
  public int compareTo(Bookmark other) {
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

  // Comparator class for sorting bookmarks
  public static class BookmarkComparator implements java.util.Comparator<Bookmark> {
    @Override
    public int compare(Bookmark a, Bookmark b) {
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
