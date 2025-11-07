package us.ullberg.startpunkt.objects;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.quarkus.runtime.annotations.RegisterForReflection;
import java.util.List;

/**
 * Represents a list of bookmark groups. Used for serialization and deserialization of grouped
 * bookmarks.
 */
@RegisterForReflection(registerFullHierarchy = true)
public class BookmarkGroupList {

  private List<BookmarkGroup> groups;

  /** Default constructor for deserialization. */
  public BookmarkGroupList() {
    // default constructor for deserialization
  }

  /**
   * Constructs a BookmarkGroupList with the given list of groups.
   *
   * @param groups list of BookmarkGroup
   */
  public BookmarkGroupList(List<BookmarkGroup> groups) {
    this.groups = groups;
  }

  /**
   * Gets the list of bookmark groups.
   *
   * @return list of groups, or an empty list if none are set
   */
  @JsonProperty("groups")
  public List<BookmarkGroup> getGroups() {
    return groups != null ? groups : List.of();
  }

  /**
   * Sets the list of bookmark groups.
   *
   * @param groups list of BookmarkGroup
   */
  @JsonProperty("groups")
  public void setGroups(List<BookmarkGroup> groups) {
    this.groups = groups != null ? groups : List.of();
  }

  @Override
  public String toString() {
    return "BookmarkGroupList{groups=" + groups + '}';
  }
}
