package us.ullberg.startpunkt.objects;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import io.quarkus.runtime.annotations.RegisterForReflection;

@RegisterForReflection(registerFullHierarchy = true)
public class BookmarkGroupList {
  private List<BookmarkGroup> list;

  public BookmarkGroupList(List<BookmarkGroup> list) {
    this.list = list;
  }

  @JsonProperty("groups")
  public List<BookmarkGroup> groups() {
    return list;
  }
}
