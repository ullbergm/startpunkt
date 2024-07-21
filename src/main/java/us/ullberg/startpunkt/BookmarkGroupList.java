package us.ullberg.startpunkt;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

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
