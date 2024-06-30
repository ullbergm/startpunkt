package us.ullberg.startpunkt.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.quarkus.runtime.annotations.RegisterForReflection;
import java.util.ArrayList;

// Group class
@RegisterForReflection(registerFullHierarchy = true)
public class BookmarkGroup implements Comparable<BookmarkGroup> {
  // Constructor
  public BookmarkGroup(String name) {
    Name = name;
    Bookmarks = new ArrayList<Bookmark>();
  }

  public BookmarkGroup(String name, ArrayList<Bookmark> bookmarks) {
    Name = name;
    Bookmarks = bookmarks;
  }

  // Private fields
  private String Name;
  private ArrayList<Bookmark> Bookmarks;

  // Getter methods with annotations
  @JsonProperty("name")
  public String getName() {
    return Name;
  }

  @JsonProperty("bookmarks")
  public ArrayList<Bookmark> getBookmarks() {
    return Bookmarks;
  }

  // Implement Comparable interface for sorting by name
  @Override
  public int compareTo(BookmarkGroup other) {
    return this.getName().compareTo(other.getName());
  }

  public void addBookmark(Bookmark app) {
    Bookmarks.add(app);
  }
}
