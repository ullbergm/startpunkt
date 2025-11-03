package us.ullberg.startpunkt.graphql.types;

import java.time.Instant;
import org.eclipse.microprofile.graphql.Description;
import org.eclipse.microprofile.graphql.Type;

/**
 * Event payload for bookmark update subscriptions.
 *
 * <p>This type is sent to subscribers when bookmarks are added, updated, or removed in the system.
 */
@Type("BookmarkUpdateEvent")
public class BookmarkUpdateEvent {

  @Description("The type of update (ADDED, UPDATED, or REMOVED)")
  private BookmarkUpdateType type;

  @Description("The bookmark that was updated")
  private BookmarkType bookmark;

  @Description("Timestamp when the event occurred")
  private Instant timestamp;

  /** Default constructor for serialization. */
  public BookmarkUpdateEvent() {}

  /**
   * Constructor with all fields.
   *
   * @param type the type of update
   * @param bookmark the bookmark that was updated
   * @param timestamp the timestamp when the event occurred
   */
  public BookmarkUpdateEvent(BookmarkUpdateType type, BookmarkType bookmark, Instant timestamp) {
    this.type = type;
    this.bookmark = bookmark;
    this.timestamp = timestamp;
  }

  public BookmarkUpdateType getType() {
    return type;
  }

  public void setType(BookmarkUpdateType type) {
    this.type = type;
  }

  public BookmarkType getBookmark() {
    return bookmark;
  }

  public void setBookmark(BookmarkType bookmark) {
    this.bookmark = bookmark;
  }

  public Instant getTimestamp() {
    return timestamp;
  }

  public void setTimestamp(Instant timestamp) {
    this.timestamp = timestamp;
  }
}
