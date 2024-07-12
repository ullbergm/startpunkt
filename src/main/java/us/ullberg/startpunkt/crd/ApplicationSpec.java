package us.ullberg.startpunkt.crd;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.fabric8.generator.annotation.Required;
import io.quarkus.runtime.annotations.RegisterForReflection;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
@RegisterForReflection(registerFullHierarchy = true)
public class ApplicationSpec implements Comparable<ApplicationSpec> {
  @JsonProperty("name")
  @JsonPropertyDescription("Application name")
  @Required
  public String name;

  @JsonProperty("group")
  @JsonPropertyDescription("Group the bookmark belongs to")
  @Required
  private String group;

  @JsonProperty("icon")
  @JsonPropertyDescription("Application icon, e.g. 'mdi:home', 'https://example.com/icon.png'")
  private String icon;

  @JsonProperty("iconColor")
  @JsonPropertyDescription("Application icon color, e.g. 'red'")
  private String iconColor;

  @JsonProperty("url")
  @JsonPropertyDescription("Application URL")
  @Required
  private String url;

  @JsonProperty("info")
  @JsonPropertyDescription("Description of the bookmark")
  private String info;

  @JsonProperty("targetBlank")
  @JsonPropertyDescription("Open the URL in a new tab")
  private Boolean targetBlank;

  @JsonProperty("location")
  @JsonPropertyDescription("Sorting order of the bookmark")
  private int location;

  @JsonProperty("enabled")
  @JsonPropertyDescription("Enable the bookmark")
  private Boolean enabled;

  // Constructor
  public ApplicationSpec(){}
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

  // Getters and Setters
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

  @Override
  public String toString() {
    return "ApplicationSpec{" + "name='" + name + '\'' + ", group='" + group + '\'' + ", icon='"
        + icon + '\'' + ", iconColor='" + iconColor + '\'' + ", url='" + url + '\'' + ", info='"
        + info + '\'' + ", targetBlank=" + targetBlank + ", location=" + location + ", enabled="
        + enabled + '}';
  }

  // Implement Comparable interface
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
}
