package us.ullberg.startpunkt;

import java.util.ArrayList;

import com.fasterxml.jackson.annotation.JsonProperty;

import io.quarkus.runtime.annotations.RegisterForReflection;
import us.ullberg.startpunkt.crd.BookmarkSpec;

// Class representing a group of bookmarks
@RegisterForReflection(registerFullHierarchy = true)
public class BookmarkGroup implements Comparable<BookmarkGroup> {

  // Private fields
  private String name;
  private ArrayList<BookmarkSpec> bookmarks;

  // Constructor to initialize the BookmarkGroup with a name
  public BookmarkGroup(String name) {
    this.name = name;
    bookmarks = new ArrayList<>();
  }

  // Constructor to initialize the BookmarkGroup with a name and a list of bookmarks
  public BookmarkGroup(String name, ArrayList<BookmarkSpec> bookmarks) {
    this.name = name;
    this.bookmarks = bookmarks;
  }

  // Getter method for the name field with JSON property annotation
  @JsonProperty("name")
  public String getName() {
    return name;
  }

  // Getter method for the bookmarks field with JSON property annotation
  @JsonProperty("bookmarks")
  public ArrayList<BookmarkSpec> getBookmarks() {
    return bookmarks;
  }

  // Override compareTo method to compare BookmarkGroup objects by name
  @Override
  public int compareTo(BookmarkGroup other) {
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
    BookmarkGroup otherGroup = (BookmarkGroup) other;
    if (name != null ? !name.equals(otherGroup.name) : otherGroup.name != null) {
      return false;
    }
    if (bookmarks != null ? bookmarks.equals(otherGroup.bookmarks) : otherGroup.bookmarks != null) {
      return false;
    }
    return true;
  }

  // Method to add a bookmark to the bookmarks list
  public void addBookmark(BookmarkSpec bookmark) {
    bookmarks.add(bookmark);
  }
}
