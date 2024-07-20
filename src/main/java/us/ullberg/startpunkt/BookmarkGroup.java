package us.ullberg.startpunkt;

import java.util.ArrayList;

import com.fasterxml.jackson.annotation.JsonProperty;

import io.quarkus.runtime.annotations.RegisterForReflection;
import us.ullberg.startpunkt.crd.BookmarkSpec;

// Class representing a group of bookmarks
@RegisterForReflection(registerFullHierarchy = true)
public class BookmarkGroup implements Comparable<BookmarkGroup> {

  // Private fields
  private String Name;
  private ArrayList<BookmarkSpec> Bookmarks;

  // Constructor to initialize the BookmarkGroup with a name
  public BookmarkGroup(String name) {
    Name = name;
    Bookmarks = new ArrayList<BookmarkSpec>();
  }

  // Constructor to initialize the BookmarkGroup with a name and a list of bookmarks
  public BookmarkGroup(String name, ArrayList<BookmarkSpec> bookmarks) {
    Name = name;
    Bookmarks = bookmarks;
  }

  // Getter method for the name field with JSON property annotation
  @JsonProperty("name")
  public String getName() {
    return Name;
  }

  // Getter method for the bookmarks field with JSON property annotation
  @JsonProperty("bookmarks")
  public ArrayList<BookmarkSpec> getBookmarks() {
    return Bookmarks;
  }

  // Override compareTo method to compare BookmarkGroup objects by name
  @Override
  public int compareTo(BookmarkGroup other) {
    return this.getName().compareTo(other.getName());
  }

  // Method to add a bookmark to the bookmarks list
  public void addBookmark(BookmarkSpec bookmark) {
    Bookmarks.add(bookmark);
  }
}
