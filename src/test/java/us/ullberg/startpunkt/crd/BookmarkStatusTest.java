package us.ullberg.startpunkt.crd;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

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
