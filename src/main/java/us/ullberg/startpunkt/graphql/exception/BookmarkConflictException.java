package us.ullberg.startpunkt.graphql.exception;

/**
 * Exception thrown when attempting to create a bookmark that already exists. This exception is
 * designed to be user-friendly and provide clear guidance.
 */
public class BookmarkConflictException extends RuntimeException {

  /**
   * Constructs a new bookmark conflict exception with the specified detail message.
   *
   * @param message the detail message
   */
  public BookmarkConflictException(String message) {
    super(message);
  }

  /**
   * Constructs a new bookmark conflict exception with the specified detail message and cause.
   *
   * @param message the detail message
   * @param cause the cause
   */
  public BookmarkConflictException(String message, Throwable cause) {
    super(message, cause);
  }
}
