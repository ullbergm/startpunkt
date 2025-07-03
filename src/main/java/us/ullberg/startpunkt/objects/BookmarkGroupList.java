package us.ullberg.startpunkt.objects;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import io.quarkus.runtime.annotations.RegisterForReflection;

@RegisterForReflection(registerFullHierarchy = true)
public class BookmarkGroupList {
  private List<BookmarkGroup> groups;

  public BookmarkGroupList() {
    // default constructor for deserialization
  }

  public BookmarkGroupList(List<BookmarkGroup> groups) {
    this.groups = groups;
  }

  @JsonProperty("groups")
  public List<BookmarkGroup> getGroups() {
    return groups != null ? groups : List.of();
  }

  @JsonProperty("groups")
  public void setGroups(List<BookmarkGroup> groups) {
    this.groups = groups != null ? groups : List.of();
  }

  @Override
  public String toString() {
    return "BookmarkGroupList{groups=" + groups + '}';
  }
}
