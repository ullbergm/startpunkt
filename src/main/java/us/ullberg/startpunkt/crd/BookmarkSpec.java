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
public class BookmarkSpec implements Comparable<BookmarkSpec> {

  // Bookmark name, marked as required
  @JsonProperty("name")
  @JsonPropertyDescription("Bookmark name")
  @Required
  public String name;

  // Group the bookmark belongs to, marked as required
  @JsonProperty("group")
  @JsonPropertyDescription("Group the bookmark belongs to")
  @Required
  private String group;

  // Bookmark icon, either as an icon name or URL
  @JsonProperty("icon")
  @JsonPropertyDescription("Bookmark icon, e.g. 'mdi:home', 'https://example.com/icon.png'")
  private String icon;

  // Bookmark URL, marked as required
  @JsonProperty("url")
  @JsonPropertyDescription("Bookmark URL")
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

  // Default constructor
  public BookmarkSpec() {}

  // Parameterized constructor to initialize the fields
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

  // Override the toString method to provide a string representation of the object
  @Override
  public String toString() {
    return "BookmarkSpec{" + "name='" + name + '\'' + ", group='" + group + '\'' + ", icon='" + icon
        + '\'' + ", url='" + url + '\'' + ", info='" + info + '\'' + ", targetBlank=" + targetBlank
        + ", location=" + location + '}';
  }

  // Implement the Comparable interface to compare BookmarkSpec objects
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

  @Override
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    }
    if (other == null || getClass() != other.getClass()) {
      return false;
    }
    BookmarkSpec otherSpec = (BookmarkSpec) other;
    if (location != otherSpec.location) {
      return false;
    }
    if (name != null ? !name.equals(otherSpec.name) : otherSpec.name != null) {
      return false;
    }
    if (group != null ? !group.equals(otherSpec.group) : otherSpec.group != null) {
      return false;
    }
    if (icon != null ? !icon.equals(otherSpec.icon) : otherSpec.icon != null) {
      return false;
    }
    if (url != null ? !url.equals(otherSpec.url) : otherSpec.url != null) {
      return false;
    }
    if (info != null ? !info.equals(otherSpec.info) : otherSpec.info != null) {
      return false;
    }
    return targetBlank != null ? targetBlank.equals(otherSpec.targetBlank)
        : otherSpec.targetBlank == null;
  }

  @Override
  public int hashCode() {
    int result = name != null ? name.hashCode() : 0;
    result = 31 * result + (group != null ? group.hashCode() : 0);
    result = 31 * result + (icon != null ? icon.hashCode() : 0);
    result = 31 * result + (url != null ? url.hashCode() : 0);
    result = 31 * result + (info != null ? info.hashCode() : 0);
    result = 31 * result + (targetBlank != null ? targetBlank.hashCode() : 0);
    result = 31 * result + location;
    return result;
  }
}
