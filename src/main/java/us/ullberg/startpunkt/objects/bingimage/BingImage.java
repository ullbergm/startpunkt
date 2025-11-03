package us.ullberg.startpunkt.objects.bingimage;

/**
 * Represents Bing's Image of the Day with metadata and optimized image URL based on client screen
 * resolution.
 */
public class BingImage {

  /** The optimized image URL for the client's screen resolution. */
  private String imageUrl;

  /** Copyright information for the image. */
  private String copyright;

  /** Title or description of the image. */
  private String title;

  /** Date of the image in YYYYMMDD format. */
  private String date;

  /** Default constructor for frameworks and serialization. */
  public BingImage() {}

  /**
   * Constructs a BingImage with all properties.
   *
   * @param imageUrl the optimized image URL
   * @param copyright copyright information
   * @param title image title
   * @param date image date in YYYYMMDD format
   */
  public BingImage(String imageUrl, String copyright, String title, String date) {
    this.imageUrl = imageUrl;
    this.copyright = copyright;
    this.title = title;
    this.date = date;
  }

  /**
   * Gets the optimized image URL.
   *
   * @return the image URL
   */
  public String getImageUrl() {
    return imageUrl;
  }

  /**
   * Sets the optimized image URL.
   *
   * @param imageUrl the image URL
   */
  public void setImageUrl(String imageUrl) {
    this.imageUrl = imageUrl;
  }

  /**
   * Gets the copyright information.
   *
   * @return the copyright text
   */
  public String getCopyright() {
    return copyright;
  }

  /**
   * Sets the copyright information.
   *
   * @param copyright the copyright text
   */
  public void setCopyright(String copyright) {
    this.copyright = copyright;
  }

  /**
   * Gets the image title.
   *
   * @return the title
   */
  public String getTitle() {
    return title;
  }

  /**
   * Sets the image title.
   *
   * @param title the title
   */
  public void setTitle(String title) {
    this.title = title;
  }

  /**
   * Gets the image date.
   *
   * @return the date in YYYYMMDD format
   */
  public String getDate() {
    return date;
  }

  /**
   * Sets the image date.
   *
   * @param date the date in YYYYMMDD format
   */
  public void setDate(String date) {
    this.date = date;
  }
}
