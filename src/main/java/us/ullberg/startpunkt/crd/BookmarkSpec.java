package us.ullberg.startpunkt.crd;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.fabric8.generator.annotation.Required;
import io.quarkus.runtime.annotations.RegisterForReflection;

/**
 * Represents the specification of a Bookmark custom resource. Includes properties such as name,
 * group, icon, URL, info, target behavior, and sorting location.
 */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
@RegisterForReflection(registerFullHierarchy = true)
public class BookmarkSpec implements Comparable<BookmarkSpec> {

  /** Bookmark name (required). */
  @JsonProperty("name")
  @JsonPropertyDescription("Bookmark name")
  @Required
  public String name;

  /** Group the bookmark belongs to (required). */
  @JsonProperty("group")
  @JsonPropertyDescription("Group the bookmark belongs to")
  @Required
  private String group;

  /** Bookmark icon (optional), e.g. icon name or URL. */
  @JsonProperty("icon")
  @JsonPropertyDescription("Bookmark icon, e.g. 'mdi:home', 'https://example.com/icon.png'")
  private String icon;

  /** Bookmark URL (required). */
  @JsonProperty("url")
  @JsonPropertyDescription("Bookmark URL")
  @Required
  private String url;

  /** Description or additional info about the bookmark (optional). */
  @JsonProperty("info")
  @JsonPropertyDescription("Description of the bookmark")
  private String info;

  /** Whether the URL should open in a new tab (optional). */
  @JsonProperty("targetBlank")
  @JsonPropertyDescription("Open the URL in a new tab")
  private Boolean targetBlank;

  /** Sorting order for bookmarks (optional). Lower numbers sort first. */
  @JsonProperty("location")
  @JsonPropertyDescription("Sorting order of the bookmark")
  private int location;

  /** Instance tag for filtering bookmarks in multi-instance deployments. */
  @JsonProperty("instance")
  @JsonPropertyDescription("Instance tag for filtering bookmarks in multi-instance deployments")
  private String instance;

  /** Default no-argument constructor. */
  public BookmarkSpec() {}

  /**
   * Constructs a BookmarkSpec with all properties.
   *
   * @param name bookmark name
   * @param group bookmark group
   * @param icon bookmark icon (optional)
   * @param url bookmark URL
   * @param info description or info (optional)
   * @param targetBlank whether to open in new tab (optional)
   * @param location sorting order
   * @param instance instance tag for filtering bookmarks in multi-instance deployments
   */
  public BookmarkSpec(
      String name,
      String group,
      String icon,
      String url,
      String info,
      Boolean targetBlank,
      int location,
      String instance) {
    this.name = name;
    this.group = group;
    this.icon = icon;
    this.url = url;
    this.info = info;
    this.targetBlank = targetBlank;
    this.location = location;
    this.instance = instance;
  }

  /**
   * Constructs a BookmarkSpec with all properties except instance (for backward compatibility).
   *
   * @param name bookmark name
   * @param group bookmark group
   * @param icon bookmark icon (optional)
   * @param url bookmark URL
   * @param info description or info (optional)
   * @param targetBlank whether to open in new tab (optional)
   * @param location sorting order
   */
  public BookmarkSpec(
      String name,
      String group,
      String icon,
      String url,
      String info,
      Boolean targetBlank,
      int location) {
    this(name, group, icon, url, info, targetBlank, location, null);
  }

  /**
   * Get the bookmark name.
   *
   * @return the bookmark name
   */
  public String getName() {
    return name;
  }

  /**
   * Set the bookmark name.
   *
   * @param name the bookmark name to set
   */
  public void setName(String name) {
    this.name = name;
  }

  /**
   * Get the bookmark group.
   *
   * @return the bookmark group
   */
  public String getGroup() {
    return group;
  }

  /**
   * Set the bookmark group.
   *
   * @param group the bookmark group to set
   */
  public void setGroup(String group) {
    this.group = group;
  }

  /**
   * Get the bookmark icon.
   *
   * @return the bookmark icon
   */
  public String getIcon() {
    return icon;
  }

  /**
   * Set the bookmark icon.
   *
   * @param icon the bookmark icon to set
   */
  public void setIcon(String icon) {
    this.icon = icon;
  }

  /**
   * Get the bookmark url.
   *
   * @return the bookmark URL
   */
  public String getUrl() {
    return url;
  }

  /**
   * Set the bookmark url.
   *
   * @param url the bookmark URL to set
   */
  public void setUrl(String url) {
    this.url = url;
  }

  /**
   * Get the bookmark info.
   *
   * @return the bookmark info/description
   */
  public String getInfo() {
    return info;
  }

  /**
   * Set the bookmark info.
   *
   * @param info the bookmark info to set
   */
  public void setInfo(String info) {
    this.info = info;
  }

  /**
   * Get whether the url should open in a new tab.
   *
   * @return whether the URL should open in a new tab
   */
  public Boolean getTargetBlank() {
    return targetBlank;
  }

  /**
   * Set whether the url should open in a new tab.
   *
   * @param targetBlank the targetBlank flag to set
   */
  public void setTargetBlank(Boolean targetBlank) {
    this.targetBlank = targetBlank;
  }

  /**
   * Get the sorting location.
   *
   * @return the sorting location of the bookmark
   */
  public int getLocation() {
    return location;
  }

  /**
   * Set the sorting location.
   *
   * @param location the sorting location to set
   */
  public void setLocation(int location) {
    this.location = location;
  }

  /**
   * Get the instance tag for filtering bookmarks in multi-instance deployments.
   *
   * @return the instance tag
   */
  public String getInstance() {
    return instance;
  }

  /**
   * Set the instance tag for filtering bookmarks in multi-instance deployments.
   *
   * @param instance the instance tag to set
   */
  public void setInstance(String instance) {
    this.instance = instance;
  }

  /**
   * Compares two BookmarkSpec objects for sorting order. Sorting priority: group, then location,
   * then name.
   *
   * @param other another BookmarkSpec to compare against
   * @return negative if this precedes other, positive if after, zero if equal
   */
  @Override
  public int compareTo(BookmarkSpec other) {
    int groupCompare = this.getGroup().compareTo(other.getGroup());
    if (groupCompare != 0) {
      return groupCompare;
    }

    int locationCompare = Integer.compare(this.getLocation(), other.getLocation());
    if (locationCompare != 0) {
      return locationCompare;
    }

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
    if (instance != null ? !instance.equals(otherSpec.instance) : otherSpec.instance != null) {
      return false;
    }
    return targetBlank != null
        ? targetBlank.equals(otherSpec.targetBlank)
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
    result = 31 * result + (instance != null ? instance.hashCode() : 0);
    return result;
  }

  @Override
  public String toString() {
    return "BookmarkSpec{"
        + "name='"
        + name
        + '\''
        + ", group='"
        + group
        + '\''
        + ", icon='"
        + icon
        + '\''
        + ", url='"
        + url
        + '\''
        + ", info='"
        + info
        + '\''
        + ", targetBlank="
        + targetBlank
        + ", location="
        + location
        + ", instance='"
        + instance
        + '\''
        + '}';
  }
}
