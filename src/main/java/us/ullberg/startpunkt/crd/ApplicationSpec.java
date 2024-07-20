package us.ullberg.startpunkt.crd;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;

import io.fabric8.generator.annotation.Required;
import io.quarkus.runtime.annotations.RegisterForReflection;

// Include non-empty JSON properties in serialization
@JsonInclude(JsonInclude.Include.NON_EMPTY)
// Register class for reflection, including the full hierarchy
@RegisterForReflection(registerFullHierarchy = true)
public class ApplicationSpec implements Comparable<ApplicationSpec> {

  // Application name, marked as required
  @JsonProperty("name")
  @JsonPropertyDescription("Application name")
  @Required
  public String name;

  // Group the bookmark belongs to
  @JsonProperty("group")
  @JsonPropertyDescription("Group the bookmark belongs to")
  private String group;

  // Application icon, either as an icon name or URL
  @JsonProperty("icon")
  @JsonPropertyDescription("Application icon, e.g. 'mdi:home', 'https://example.com/icon.png'")
  private String icon;

  // Application icon color
  @JsonProperty("iconColor")
  @JsonPropertyDescription("Application icon color, e.g. 'red'")
  private String iconColor;

  // Application URL, marked as required
  @JsonProperty("url")
  @JsonPropertyDescription("Application URL")
  @Required
  private String url;

  // Description of the bookmark
  @JsonProperty("info")
  @JsonPropertyDescription("Description of the bookmark")
  private String info;

  // Flag to open the URL in a new tab
  @JsonProperty("targetBlank")
  @JsonPropertyDescription("Open the URL in a new tab")
  private Boolean targetBlank;

  // Sorting order of the bookmark
  @JsonProperty("location")
  @JsonPropertyDescription("Sorting order of the bookmark")
  private int location;

  // Enable the bookmark
  @JsonProperty("enabled")
  @JsonPropertyDescription("Enable the bookmark")
  private Boolean enabled;

  // Default constructor
  public ApplicationSpec() {}

  // Parameterized constructor to initialize the fields
  public ApplicationSpec(String name, String group, String icon, String iconColor, String url,
      String info, Boolean targetBlank, int location, Boolean enabled) {
    this.name = name;
    this.group = group;
    this.icon = icon;
    this.iconColor = iconColor;
    this.url = url;
    this.info = info;
    this.targetBlank = targetBlank;
    this.location = location;
    this.enabled = enabled;
  }

  // Getters and setters for each field
  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getGroup() {
    return group;
  }

  public void setGroup(String group) {
    this.group = group;
  }

  public String getIcon() {
    return icon;
  }

  public void setIcon(String icon) {
    this.icon = icon;
  }

  public String getIconColor() {
    return iconColor;
  }

  public void setIconColor(String iconColor) {
    this.iconColor = iconColor;
  }

  public String getUrl() {
    return url;
  }

  public void setUrl(String url) {
    this.url = url;
  }

  public String getInfo() {
    return info;
  }

  public void setInfo(String info) {
    this.info = info;
  }

  public Boolean getTargetBlank() {
    return targetBlank;
  }

  public void setTargetBlank(Boolean targetBlank) {
    this.targetBlank = targetBlank;
  }

  public int getLocation() {
    return location;
  }

  public void setLocation(int location) {
    this.location = location;
  }

  public Boolean getEnabled() {
    return enabled;
  }

  public void setEnabled(Boolean enabled) {
    this.enabled = enabled;
  }

  // Override the toString method to provide a string representation of the object
  @Override
  public String toString() {
    return "ApplicationSpec{" + "name='" + name + '\'' + ", group='" + group + '\'' + ", icon='"
        + icon + '\'' + ", iconColor='" + iconColor + '\'' + ", url='" + url + '\'' + ", info='"
        + info + '\'' + ", targetBlank=" + targetBlank + ", location=" + location + ", enabled="
        + enabled + '}';
  }

  // Implement the Comparable interface to compare ApplicationSpec objects
  @Override
  public int compareTo(ApplicationSpec other) {
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

  @Override
  public boolean equals(Object o) {
    if (this == o)
      return true;
    if (o == null || getClass() != o.getClass())
      return false;

    ApplicationSpec that = (ApplicationSpec) o;
    if (location != that.location) {
      return false;
    }
    if (name != null ? !name.equals(that.name) : that.name != null) {
      return false;
    }
    if (group != null ? !group.equals(that.group) : that.group != null) {
      return false;
    }
    if (icon != null ? !icon.equals(that.icon) : that.icon != null) {
      return false;
    }
    if (iconColor != null ? !iconColor.equals(that.iconColor) : that.iconColor != null) {
      return false;
    }
    if (url != null ? !url.equals(that.url) : that.url != null) {
      return false;
    }
    if (info != null ? !info.equals(that.info) : that.info != null) {
      return false;
    }
    if (targetBlank != null ? !targetBlank.equals(that.targetBlank) : that.targetBlank != null) {
      return false;
    }
    if (enabled != null ? !enabled.equals(that.enabled) : that.enabled != null) {
      return false;
    }
    return true;
  }
}
