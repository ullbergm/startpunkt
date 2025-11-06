package us.ullberg.startpunkt.graphql.exception;

/**
 * Exception thrown when attempting to create an application that already exists. This exception is
 * designed to be user-friendly and provide clear guidance.
 */
public class ApplicationConflictException extends RuntimeException {

  /**
   * Constructs a new application conflict exception with the specified detail message.
   *
   * @param message the detail message
   */
  public ApplicationConflictException(String message) {
    super(message);
  }

  /**
   * Constructs a new application conflict exception with the specified detail message and cause.
   *
   * @param message the detail message
   * @param cause the cause
   */
  public ApplicationConflictException(String message, Throwable cause) {
    super(message, cause);
  }
}
