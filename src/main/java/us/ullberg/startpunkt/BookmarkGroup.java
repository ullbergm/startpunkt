package us.ullberg.startpunkt;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.quarkus.runtime.annotations.RegisterForReflection;
import java.util.ArrayList;
import us.ullberg.startpunkt.crd.BookmarkSpec;

// Group class
@RegisterForReflection(registerFullHierarchy = true)
public class BookmarkGroup implements Comparable<BookmarkGroup> {
  // Constructor
  public BookmarkGroup(String name) {
    Name = name;
    Bookmarks = new ArrayList<BookmarkSpec>();
  }

  public BookmarkGroup(String name, ArrayList<BookmarkSpec> bookmarks) {
    Name = name;
    Bookmarks = bookmarks;
  }

  // Private fields
  private String Name;
  private ArrayList<BookmarkSpec> Bookmarks;

  // Getter methods with annotations
  @JsonProperty("name")
  public String getName() {
    return Name;
  }

  @JsonProperty("bookmarks")
  public ArrayList<BookmarkSpec> getBookmarks() {
    return Bookmarks;
  }

  // Implement Comparable interface for sorting by name
  @Override
  public int compareTo(BookmarkGroup other) {
    return this.getName().compareTo(other.getName());
  }

  public void addBookmark(BookmarkSpec app) {
    Bookmarks.add(app);
  }
}
