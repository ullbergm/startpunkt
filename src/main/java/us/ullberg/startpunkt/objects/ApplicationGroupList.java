package us.ullberg.startpunkt.objects;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.quarkus.runtime.annotations.RegisterForReflection;
import java.util.List;

/**
 * Represents a container for a list of {@link ApplicationGroup} objects. Used for JSON
 * serialization/deserialization with Quarkus reflection.
 */
@RegisterForReflection(registerFullHierarchy = true)
public class ApplicationGroupList {
  private List<ApplicationGroup> groups;

  /** Default no-arg constructor for deserialization. */
  public ApplicationGroupList() {
    // default constructor for deserialization
  }

  /**
   * Constructs an ApplicationGroupList with the specified list of groups.
   *
   * @param groups list of ApplicationGroup instances, may be null
   */
  public ApplicationGroupList(List<ApplicationGroup> groups) {
    this.groups = groups;
  }

  /**
   * Returns the list of application groups.
   *
   * @return a list of ApplicationGroup, never null (empty if none)
   */
  @JsonProperty("groups")
  public List<ApplicationGroup> getGroups() {
    return groups != null ? groups : List.of();
  }

  /**
   * Sets the list of application groups.
   *
   * @param groups list of ApplicationGroup, if null will be set to empty list
   */
  @JsonProperty("groups")
  public void setGroups(List<ApplicationGroup> groups) {
    this.groups = groups != null ? groups : List.of();
  }

  @Override
  public String toString() {
    return "ApplicationGroupList{groups=" + groups + '}';
  }
}
