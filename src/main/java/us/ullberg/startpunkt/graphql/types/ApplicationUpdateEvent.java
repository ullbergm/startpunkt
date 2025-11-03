package us.ullberg.startpunkt.graphql.types;

import java.time.Instant;
import org.eclipse.microprofile.graphql.Description;
import org.eclipse.microprofile.graphql.Type;

/**
 * Event payload for application update subscriptions.
 *
 * <p>This type is sent to subscribers when applications are added, updated, or removed in the
 * system.
 */
@Type("ApplicationUpdateEvent")
public class ApplicationUpdateEvent {

  @Description("The type of update (ADDED, UPDATED, or REMOVED)")
  private ApplicationUpdateType type;

  @Description("The application that was updated")
  private ApplicationType application;

  @Description("Timestamp when the event occurred")
  private Instant timestamp;

  /** Default constructor for serialization. */
  public ApplicationUpdateEvent() {}

  /**
   * Constructor with all fields.
   *
   * @param type the type of update
   * @param application the application that was updated
   * @param timestamp the timestamp when the event occurred
   */
  public ApplicationUpdateEvent(
      ApplicationUpdateType type, ApplicationType application, Instant timestamp) {
    this.type = type;
    this.application = application;
    this.timestamp = timestamp;
  }

  public ApplicationUpdateType getType() {
    return type;
  }

  public void setType(ApplicationUpdateType type) {
    this.type = type;
  }

  public ApplicationType getApplication() {
    return application;
  }

  public void setApplication(ApplicationType application) {
    this.application = application;
  }

  public Instant getTimestamp() {
    return timestamp;
  }

  public void setTimestamp(Instant timestamp) {
    this.timestamp = timestamp;
  }
}
