package us.ullberg.startpunkt.crd.v1alpha2;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.fabric8.generator.annotation.Required;
import io.quarkus.runtime.annotations.RegisterForReflection;

/**
 * Represents a single application bookmark specification in the Startpunkt UI.
 *
 * <p>This object defines all metadata related to a user-facing bookmark or link, such as its name,
 * group, URL, icon, sorting order, visibility, and display behavior. It is typically used as the
 * spec section in a Kubernetes custom resource representing application shortcuts.
 *
 * <p>The {@code name} and {@code url} fields are required. Other fields are optional and enhance
 * the UI experience.
 */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
@RegisterForReflection(registerFullHierarchy = true)
public class ApplicationSpec implements Comparable<ApplicationSpec> {

  /** Application name (required). */
  @JsonProperty("name")
  @JsonPropertyDescription("Application name")
  @Required
  public String name;

  /** Group the bookmark belongs to. */
  @JsonProperty("group")
  @JsonPropertyDescription("Group the bookmark belongs to")
  private String group;

  /** Application icon, either as a name (e.g. mdi:home) or URL. */
  @JsonProperty("icon")
  @JsonPropertyDescription("Application icon, e.g. 'mdi:home', 'https://example.com/icon.png'")
  private String icon;

  /** Color for the application icon. */
  @JsonProperty("iconColor")
  @JsonPropertyDescription("Application icon color, e.g. 'red'")
  private String iconColor;

  /** Application URL (required). */
  @JsonProperty("url")
  @JsonPropertyDescription("Application URL")
  @Required
  private String url;

  /** Description or additional info about the bookmark. */
  @JsonProperty("info")
  @JsonPropertyDescription("Description of the bookmark")
  private String info;

  /** Whether the link should open in a new browser tab. */
  @JsonProperty("targetBlank")
  @JsonPropertyDescription("Open the URL in a new tab")
  private Boolean targetBlank;

  /** Sorting order for the bookmark in the UI. */
  @JsonProperty("location")
  @JsonPropertyDescription("Sorting order of the bookmark")
  private int location;

  /** Whether the bookmark is enabled and should be shown. */
  @JsonProperty("enabled")
  @JsonPropertyDescription("Enable the bookmark")
  private Boolean enabled;

  /** Root path to append to the URL. */
  @JsonProperty("rootPath")
  @JsonPropertyDescription("Root path to append to the URL")
  private String rootPath;

  /** Default constructor. */
  public ApplicationSpec() {}

  /**
   * Parameterized constructor to initialize all fields.
   *
   * @param name the application name (required)
   * @param group the group the bookmark belongs to
   * @param icon the application icon
   * @param iconColor the icon color
   * @param url the application URL (required)
   * @param info description of the bookmark
   * @param targetBlank whether to open the URL in a new tab
   * @param location sorting order of the bookmark
   * @param enabled whether the bookmark is enabled
   */
  public ApplicationSpec(
      String name,
      String group,
      String icon,
      String iconColor,
      String url,
      String info,
      Boolean targetBlank,
      int location,
      Boolean enabled) {
    this.name = name;
    this.group = group;
    this.icon = icon;
    this.iconColor = iconColor;
    this.url = url;
    this.info = info;
    this.targetBlank = targetBlank;
    this.location = location;
    this.enabled = enabled;
    this.rootPath = null;
  }

  /**
   * Parameterized constructor to initialize all fields.
   *
   * @param name the application name (required)
   * @param group the group the bookmark belongs to
   * @param icon the application icon
   * @param iconColor the icon color
   * @param url the application URL (required)
   * @param info description of the bookmark
   * @param targetBlank whether to open the URL in a new tab
   * @param location sorting order of the bookmark
   * @param enabled whether the bookmark is enabled
   * @param rootPath root path to append to the URL
   */
  public ApplicationSpec(
      String name,
      String group,
      String icon,
      String iconColor,
      String url,
      String info,
      Boolean targetBlank,
      int location,
      Boolean enabled,
      String rootPath) {
    this.name = name;
    this.group = group;
    this.icon = icon;
    this.iconColor = iconColor;
    this.url = url;
    this.info = info;
    this.targetBlank = targetBlank;
    this.location = location;
    this.enabled = enabled;
    this.rootPath = rootPath;
  }

  /**
   * Gets the name of the application bookmark.
   *
   * @return application name
   */
  public String getName() {
    return name;
  }

  /**
   * Sets the name of the application bookmark.
   *
   * @param name application name
   */
  public void setName(String name) {
    this.name = name;
  }

  /**
   * Gets the group this bookmark belongs to.
   *
   * @return group the bookmark belongs to
   */
  public String getGroup() {
    return group;
  }

  /**
   * Sets the group this bookmark belongs to.
   *
   * @param group the group name
   */
  public void setGroup(String group) {
    this.group = group;
  }

  /**
   * Gets the icon for this bookmark.
   *
   * @return application icon
   */
  public String getIcon() {
    return icon;
  }

  /**
   * Sets the icon for this bookmark.
   *
   * @param icon icon name or URL
   */
  public void setIcon(String icon) {
    this.icon = icon;
  }

  /**
   * Gets the color of the bookmark icon.
   *
   * @return icon color
   */
  public String getIconColor() {
    return iconColor;
  }

  /**
   * Sets the color of the bookmark icon.
   *
   * @param iconColor icon color name
   */
  public void setIconColor(String iconColor) {
    this.iconColor = iconColor;
  }

  /**
   * Gets the URL the bookmark points to.
   *
   * @return application URL
   */
  public String getUrl() {
    return url;
  }

  /**
   * Sets the URL the bookmark points to.
   *
   * @param url application URL
   */
  public void setUrl(String url) {
    this.url = url;
  }

  /**
   * Gets the optional info or description of the bookmark.
   *
   * @return additional info or description
   */
  public String getInfo() {
    return info;
  }

  /**
   * Sets the optional info or description of the bookmark.
   *
   * @param info additional bookmark info
   */
  public void setInfo(String info) {
    this.info = info;
  }

  /**
   * Gets whether the URL should open in a new browser tab.
   *
   * @return true if the link should open in a new tab
   */
  public Boolean getTargetBlank() {
    return targetBlank;
  }

  /**
   * Sets whether the URL should open in a new browser tab.
   *
   * @param targetBlank whether to open the URL in a new tab
   */
  public void setTargetBlank(Boolean targetBlank) {
    this.targetBlank = targetBlank;
  }

  /**
   * Gets the sorting order of the bookmark.
   *
   * @return sorting order
   */
  public int getLocation() {
    return location;
  }

  /**
   * Sets the sorting order of the bookmark.
   *
   * @param location sorting order
   */
  public void setLocation(int location) {
    this.location = location;
  }

  /**
   * Gets whether the bookmark is enabled.
   *
   * @return true if the bookmark is enabled
   */
  public Boolean getEnabled() {
    return enabled;
  }

  /**
   * Sets whether the bookmark is enabled.
   *
   * @param enabled whether the bookmark is enabled
   */
  public void setEnabled(Boolean enabled) {
    this.enabled = enabled;
  }

  /**
   * Gets the root path to append to the URL.
   *
   * @return root path string
   */
  public String getRootPath() {
    return rootPath;
  }

  /**
   * Sets the root path to append to the URL.
   *
   * @param rootPath root path string
   */
  public void setRootPath(String rootPath) {
    this.rootPath = rootPath;
  }

  /**
   * Compares this ApplicationSpec with another for sorting by group, location, and name. Group and
   * name comparisons are case-insensitive.
   *
   * @param other the other ApplicationSpec
   * @return negative, zero, or positive integer
   */
  @Override
  public int compareTo(ApplicationSpec other) {
    int groupCompare = this.getGroup().compareToIgnoreCase(other.getGroup());
    if (groupCompare != 0) {
      return groupCompare;
    }

    int locationCompare = Integer.compare(this.getLocation(), other.getLocation());
    if (locationCompare != 0) {
      return locationCompare;
    }

    return this.getName().compareToIgnoreCase(other.getName());
  }

  /**
   * Checks if this ApplicationSpec is equal to another object.
   *
   * @param o other object
   * @return true if equal
   */
  @Override
  public boolean equals(Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }

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
    if (rootPath != null ? !rootPath.equals(that.rootPath) : that.rootPath != null) {
      return false;
    }

    return true;
  }

  /**
   * Computes a hash code for this ApplicationSpec.
   *
   * @return hash code
   */
  @Override
  public int hashCode() {
    int result = name != null ? name.hashCode() : 0;
    result = 31 * result + (group != null ? group.hashCode() : 0);
    result = 31 * result + (icon != null ? icon.hashCode() : 0);
    result = 31 * result + (iconColor != null ? iconColor.hashCode() : 0);
    result = 31 * result + (url != null ? url.hashCode() : 0);
    result = 31 * result + (info != null ? info.hashCode() : 0);
    result = 31 * result + (targetBlank != null ? targetBlank.hashCode() : 0);
    result = 31 * result + location;
    result = 31 * result + (enabled != null ? enabled.hashCode() : 0);
    result = 31 * result + (rootPath != null ? rootPath.hashCode() : 0);
    return result;
  }

  /**
   * Returns a string representation of this ApplicationSpec.
   *
   * @return string with field values
   */
  @Override
  public String toString() {
    return "ApplicationSpec{"
        + "name='"
        + name
        + '\''
        + ", group='"
        + group
        + '\''
        + ", icon='"
        + icon
        + '\''
        + ", iconColor='"
        + iconColor
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
        + ", enabled="
        + enabled
        + ", rootPath='"
        + rootPath
        + '\''
        + '}';
  }
}
