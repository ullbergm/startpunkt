package us.ullberg.startpunkt.graphql.types;

import java.util.List;
import java.util.stream.Collectors;
import org.eclipse.microprofile.graphql.Description;
import org.eclipse.microprofile.graphql.Type;

/** GraphQL type for Bookmark Group. Groups bookmarks by name. */
@Type("BookmarkGroup")
@Description("A group of bookmarks, organized by custom grouping")
public class BookmarkGroupType {

  @Description("Name of the bookmark group")
  public String name;

  @Description("List of bookmarks in this group")
  public List<BookmarkType> bookmarks;

  /** Default constructor for GraphQL. */
  public BookmarkGroupType() {}

  /**
   * Constructor with name and bookmarks.
   *
   * @param name group name
   * @param bookmarks list of bookmarks
   */
  public BookmarkGroupType(String name, List<BookmarkType> bookmarks) {
    this.name = name;
    this.bookmarks = bookmarks;
  }

  /**
   * Creates a BookmarkGroupType from a BookmarkGroup.
   *
   * @param group the BookmarkGroup to convert
   * @return BookmarkGroupType
   */
  public static BookmarkGroupType fromBookmarkGroup(
      us.ullberg.startpunkt.objects.BookmarkGroup group) {
    BookmarkGroupType type = new BookmarkGroupType();
    type.name = group.getName();
    type.bookmarks =
        group.getBookmarks().stream()
            .map(
                bm ->
                    BookmarkType.fromResponse((us.ullberg.startpunkt.objects.BookmarkResponse) bm))
            .collect(Collectors.toList());
    return type;
  }
}
