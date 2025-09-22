package us.ullberg.startpunkt.crd.v1alpha3;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class BookmarkStatusTest {

  @Test
  void testInstantiation() {
    BookmarkStatus status = new BookmarkStatus();
    assertNotNull(status);
  }

  @Test
  void testEquality() {
    BookmarkStatus a = new BookmarkStatus();
    BookmarkStatus b = new BookmarkStatus();

    // These are separate instances, and no equals() override is present
    assertNotEquals(a, b);
    assertEquals(a, a);
  }
}
