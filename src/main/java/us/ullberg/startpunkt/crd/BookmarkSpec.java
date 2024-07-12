package us.ullberg.startpunkt.crd;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.fabric8.generator.annotation.Required;
import io.quarkus.runtime.annotations.RegisterForReflection;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
@RegisterForReflection(registerFullHierarchy = true)
public class BookmarkSpec implements Comparable<BookmarkSpec> {
  @JsonProperty("name")
  @JsonPropertyDescription("Bookmark name")
  @Required
  public String name;

  @JsonProperty("group")
  @JsonPropertyDescription("Group the bookmark belongs to")
  @Required
  private String group;

  @JsonProperty("icon")
  @JsonPropertyDescription("Bookmark icon, e.g. 'mdi:home', 'https://example.com/icon.png'")
  private String icon;

  @JsonProperty("url")
  @JsonPropertyDescription("Bookmark URL")
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

  // Constructor
  public BookmarkSpec(String name, String group, String icon, String url, String info,
      Boolean targetBlank, int location) {
    this.name = name;
    this.group = group;
    this.icon = icon;
    this.url = url;
    this.info = info;
    this.targetBlank = targetBlank;
    this.location = location;
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

  @Override
  public String toString() {
    return "BookmarkSpec{" + "name='" + name + '\'' + ", group='" + group + '\'' + ", icon='" + icon
        + '\'' + ", url='" + url + '\'' + ", info='" + info + '\'' + ", targetBlank=" + targetBlank
        + ", location=" + location + '}';
  }

  // Implement Comparable interface
  @Override
  public int compareTo(BookmarkSpec other) {
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
