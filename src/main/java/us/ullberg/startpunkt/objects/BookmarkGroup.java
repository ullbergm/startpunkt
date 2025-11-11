package us.ullberg.startpunkt.objects;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.quarkus.runtime.annotations.RegisterForReflection;
import java.util.Collections;
import java.util.LinkedList;
import java.util.List;
import us.ullberg.startpunkt.crd.v1alpha4.BookmarkSpec;

/**
 * Represents a group of bookmarks with a name and a list of {@link BookmarkSpec}. Implements
 * Comparable to allow sorting by group name.
 */
@RegisterForReflection(registerFullHierarchy = true)
public class BookmarkGroup implements Comparable<BookmarkGroup> {

  private String name;
  private LinkedList<BookmarkSpec> bookmarks;

  /**
   * Constructs a BookmarkGroup with the specified name.
   *
   * @param name the name of the bookmark group, cannot be null or empty
   * @throws IllegalArgumentException if name is null or empty
   */
  public BookmarkGroup(String name) {
    if (name == null || name.trim().isEmpty()) {
      throw new IllegalArgumentException("BookmarkGroup name cannot be null or empty");
    }

    this.name = name;
    bookmarks = new LinkedList<>();
  }

  /**
   * Constructs a BookmarkGroup with the specified name and bookmarks list.
   *
   * @param name the name of the bookmark group, cannot be null or empty
   * @param bookmarks the list of bookmarks to initialize with, may be null or empty
   * @throws IllegalArgumentException if name is null or empty
   */
  public BookmarkGroup(String name, List<BookmarkSpec> bookmarks) {
    if (name == null || name.trim().isEmpty()) {
      throw new IllegalArgumentException("BookmarkGroup name cannot be null or empty");
    }

    this.name = name;
    this.bookmarks = bookmarks != null ? new LinkedList<>(bookmarks) : new LinkedList<>();
  }

  /**
   * Returns the name of the bookmark group.
   *
   * @return the group name
   */
  @JsonProperty("name")
  public String getName() {
    return name;
  }

  /**
   * Returns an unmodifiable list of bookmarks in this group.
   *
   * @return list of bookmarks
   */
  @JsonProperty("bookmarks")
  public List<BookmarkSpec> getBookmarks() {
    return Collections.unmodifiableList(bookmarks);
  }

  /**
   * Compares this BookmarkGroup to another based on the group name (case-insensitive).
   *
   * @param other the other BookmarkGroup to compare to
   * @return comparison result based on name lexicographical order
   */
  @Override
  public int compareTo(BookmarkGroup other) {
    return this.getName().compareToIgnoreCase(other.getName());
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
    return (name != null ? name.equalsIgnoreCase(otherGroup.name) : otherGroup.name == null)
        && (bookmarks != null
            ? bookmarks.equals(otherGroup.bookmarks)
            : otherGroup.bookmarks == null);
  }

  @Override
  public int hashCode() {
    // Use lowercase for case-insensitive hash consistency
    int result = name != null ? name.toLowerCase().hashCode() : 0;
    result = 31 * result + (bookmarks != null ? bookmarks.hashCode() : 0);
    return result;
  }

  /**
   * Adds a bookmark to this group.
   *
   * @param bookmark the bookmark to add, must not be null
   * @throws IllegalArgumentException if bookmark is null
   */
  public void addBookmark(BookmarkSpec bookmark) {
    if (bookmark == null) {
      throw new IllegalArgumentException("Bookmark cannot be null");
    }

    bookmarks.add(bookmark);
  }

  @Override
  public String toString() {
    return "BookmarkGroup{name='" + name + "', bookmarks=" + bookmarks + '}';
  }
}
