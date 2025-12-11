import { chromium } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const APP_URL = process.env.APP_URL || 'http://localhost:8080';
const SCREENSHOT_DIR = join(__dirname, '../../../screenshots');

// Ensure screenshot directory exists
mkdirSync(SCREENSHOT_DIR, { recursive: true });

/**
 * Helper to take a screenshot with consistent settings
 */
async function takeScreenshot(page, name, options = {}) {
  const fullPath = join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({
    path: fullPath,
    fullPage: options.fullPage || false,
    ...options
  });
  console.log(`✓ Captured: ${name}.png`);
}

/**
 * Helper to wait for elements and animations
 */
async function waitForStability(page, timeout = 1500) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(timeout);
}

async function captureScreenshots() {
  console.log('Starting screenshot capture...');
  console.log(`App URL: ${APP_URL}`);

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1600, height: 1200 }, // 4:3 aspect ratio for desktop
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  // Log console messages from the page
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') {
      console.log(`[Browser ${type}]:`, msg.text());
    }
  });

  // Log page errors
  page.on('pageerror', err => {
    console.log('[Browser Error]:', err.message);
  });

  try {
    // 1. Main application view
    console.log('\n📸 Capturing main application view...');
    await page.goto(APP_URL);
    await waitForStability(page, 3000); // Wait longer for initial page load and all components
    await takeScreenshot(page, '01-main-view', { fullPage: true });

    // 2. Applications view with groups
    console.log('\n📸 Capturing applications with groups...');
    await page.click('a:has-text("Applications")');
    await waitForStability(page, 2000); // Wait for view transition
    await takeScreenshot(page, '02-applications-view', { fullPage: true });

    // 3. Bookmarks view
    console.log('\n📸 Capturing bookmarks view...');
    await page.click('a:has-text("Bookmarks")');
    await waitForStability(page, 2000); // Wait for view transition
    await takeScreenshot(page, '03-bookmarks-view', { fullPage: true });

    // 4. Spotlight Search - Opening
    console.log('\n📸 Capturing spotlight search...');
    await page.click('a:has-text("Applications")');
    await waitForStability(page, 1500);
    await page.keyboard.press('/');
    await waitForStability(page, 1000); // Wait for search modal to appear
    await takeScreenshot(page, '04-spotlight-search-open');

    // 5. Spotlight Search - With query
    console.log('\n📸 Capturing spotlight search with results...');
    await page.fill('input[placeholder*="Search"]', 'grafana');
    await waitForStability(page, 800); // Wait for search results
    await takeScreenshot(page, '05-spotlight-search-results');

    // Close search
    await page.keyboard.press('Escape');
    await waitForStability(page, 500);

    // Check what features are available
    console.log('\n🔍 Checking available features...');
    const availableFeatures = await page.evaluate(() => {
      return {
        hasLayoutSettings: !!document.querySelector('button[aria-label="Layout settings"]'),
        hasBackgroundSettings: !!document.querySelector('button[aria-label="Background settings"]'),
        hasAccessibilitySettings: !!document.querySelector('button[aria-label="Accessibility settings"]')
      };
    });
    console.log('Available features:', availableFeatures);

    // 6. Layout Settings (if available)
    if (availableFeatures.hasLayoutSettings) {
      console.log('\n📸 Capturing layout settings...');
      const layoutButton = page.locator('button[aria-label="Layout settings"]');
      await layoutButton.waitFor({ state: 'visible', timeout: 10000 });
      await layoutButton.click();
      await waitForStability(page, 1000); // Wait for dropdown to fully render
      await takeScreenshot(page, '06-layout-settings');

      // Close by pressing Escape instead of clicking
      await page.keyboard.press('Escape');
      await waitForStability(page, 500);
    } else {
      console.log('\n⏭️  Skipping layout settings (not available)');
    }

    // 7-9. Background Settings (if available)
    if (availableFeatures.hasBackgroundSettings) {
      console.log('\n📸 Capturing background settings...');

      // Debug: check button state BEFORE creating locator
      const buttonInfo = await page.evaluate(() => {
        const btn = document.querySelector('button[aria-label="Background settings"]');
        if (!btn) return { exists: false };
        const rect = btn.getBoundingClientRect();
        const styles = window.getComputedStyle(btn);
        const parent = btn.parentElement;
        const parentStyles = parent ? window.getComputedStyle(parent) : null;
        return {
          exists: true,
          visible: btn.offsetParent !== null,
          display: styles.display,
          visibility: styles.visibility,
          opacity: styles.opacity,
          position: styles.position,
          zIndex: styles.zIndex,
          rect: { top: rect.top, left: rect.left, bottom: rect.bottom, right: rect.right, width: rect.width, height: rect.height },
          inViewport: rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth,
          parentClasses: parent?.className,
          parentDisplay: parentStyles?.display,
          parentVisibility: parentStyles?.visibility
        };
      });
      console.log('Background button state:', JSON.stringify(buttonInfo, null, 2));

      if (!buttonInfo.visible || buttonInfo.opacity === '0') {
        console.log('⚠️  Background button exists but is not visible, skipping...');
      } else {
        const bgButton = page.locator('button[aria-label="Background settings"]');

        // Try direct click without waiting for visibility
        try {
          await bgButton.click({ timeout: 5000 });

          // Wait for dropdown menu to appear
          const bgDropdown = page.locator('.dropdown-menu').filter({ hasText: 'Background Settings' });
          await bgDropdown.waitFor({ state: 'visible', timeout: 5000 });
          await waitForStability(page, 1000); // Wait for dropdown to fully render
          await takeScreenshot(page, '07-background-settings-theme');

          // 8. Background Settings - Solid color
          await page.locator('select.form-select').first().selectOption('solid');
          await waitForStability(page, 800); // Wait for UI update
          await takeScreenshot(page, '08-background-settings-solid');

          // 9. Background Settings - Gradient
          await page.locator('select.form-select').first().selectOption('gradient');
          await waitForStability(page, 800); // Wait for UI update
          await takeScreenshot(page, '09-background-settings-gradient');

          // Close by clicking elsewhere
          await page.keyboard.press('Escape');
          await waitForStability(page, 500);
        } catch (e) {
          console.log(`Failed to capture background settings: ${e.message}`);
          console.log('Skipping background settings screenshots');
          // Continue without failing
        }
      }
    } else {
      console.log('\n⏭️  Skipping background settings (not available)');
    }

    // 10-14. Accessibility Settings (if available)
    if (availableFeatures.hasAccessibilitySettings) {
      console.log('\n📸 Capturing accessibility settings...');

      // Re-check if button still exists (might have disappeared after previous interactions)
      const a11yExists = await page.evaluate(() => {
        const btn = document.querySelector('button[aria-label="Accessibility settings"]');
        if (!btn) return false;
        const styles = window.getComputedStyle(btn);
        return btn.offsetParent !== null && styles.opacity !== '0';
      });

      if (!a11yExists) {
        console.log('⚠️  Accessibility button no longer visible, skipping...');
      } else {
        try {
          const a11yButton = page.locator('button[aria-label="Accessibility settings"]');
          await a11yButton.click({ timeout: 5000 });

          // Wait for dropdown to appear
          const a11yDropdown = page.locator('.dropdown-menu').filter({ hasText: 'Accessibility' });
          await a11yDropdown.waitFor({ state: 'visible', timeout: 5000 });
          await waitForStability(page, 1000); // Wait for dropdown to fully render
          await takeScreenshot(page, '10-accessibility-settings');

          // 11. Accessibility - Increased font size
          console.log('\n📸 Capturing increased font size...');
          await page.click('button[aria-label="Increase font size"]');
          await page.click('button[aria-label="Increase font size"]');
          await waitForStability(page, 800); // Wait for font size changes to apply
          await takeScreenshot(page, '11-accessibility-large-font');

          // Reset font size
          await page.click('button[aria-label="Reset font size"]');
          await waitForStability(page, 500);

          // 12. Accessibility - High contrast mode
          console.log('\n📸 Capturing high contrast mode...');
          await page.click('button[aria-label="Toggle high contrast"]');
          await waitForStability(page, 1000); // Wait for contrast mode to apply
          await takeScreenshot(page, '12-accessibility-high-contrast', { fullPage: true });

          // Close accessibility panel
          await page.keyboard.press('Escape');
          await waitForStability(page, 500);

          // 13. High contrast with main view
          console.log('\n📸 Capturing high contrast main view...');
          await takeScreenshot(page, '13-high-contrast-main-view', { fullPage: true });

          // 14. High contrast with spotlight search
          console.log('\n📸 Capturing high contrast spotlight search...');
          await page.keyboard.press('/');
          await waitForStability(page, 1000); // Wait for search modal
          await page.fill('input[placeholder*="Search"]', 'monitoring');
          await waitForStability(page, 800); // Wait for search results
          await takeScreenshot(page, '14-high-contrast-search');

          // Close search
          await page.keyboard.press('Escape');
          await waitForStability(page, 300);

          // Reset high contrast for next screenshots
          await a11yButton.click();
          await a11yDropdown.waitFor({ state: 'visible', timeout: 5000 });
          await waitForStability(page, 300);
          await page.click('button[aria-label="Toggle high contrast"]');
          await waitForStability(page, 300);
          await page.keyboard.press('Escape');
          await waitForStability(page, 300);
        } catch (e) {
          console.log(`Failed to capture accessibility settings: ${e.message}`);
          console.log('Skipping accessibility settings screenshots');
        }
      }
    } else {
      console.log('\n⏭️  Skipping accessibility settings (not available)');
    }

    // 15-17. Different backgrounds (if background settings available)
    if (availableFeatures.hasBackgroundSettings) {
      // Re-check if button still exists
      const bgStillExists = await page.evaluate(() => {
        const btn = document.querySelector('button[aria-label="Background settings"]');
        if (!btn) return false;
        const styles = window.getComputedStyle(btn);
        return btn.offsetParent !== null && styles.opacity !== '0';
      });

      if (!bgStillExists) {
        console.log('\n⏭️  Skipping different background variations (button not visible)');
      } else {
        try {
          const bgButton = page.locator('button[aria-label="Background settings"]');
          const bgDropdown = page.locator('.dropdown-menu').filter({ hasText: 'Background Settings' });

          // 15. Different background - Solid color with applications
          console.log('\n📸 Capturing solid color background...');
          await bgButton.click({ timeout: 5000 });
          await bgDropdown.waitFor({ state: 'visible', timeout: 5000 });
          await waitForStability(page, 300);
          await page.locator('select.form-select').first().selectOption('solid');
          await waitForStability(page, 300);
          // Change color
          await page.fill('input[type="color"]', '#2c3e50');
          await waitForStability(page, 500);
          await page.keyboard.press('Escape');
          await waitForStability(page, 500);
          await takeScreenshot(page, '15-solid-background'); // Viewport only for 4:3 ratio

          // 16. Gradient background
          console.log('\n📸 Capturing gradient background...');
          await bgButton.click({ timeout: 5000 });
          await bgDropdown.waitFor({ state: 'visible', timeout: 5000 });
          await waitForStability(page, 300);
          await page.locator('select.form-select').first().selectOption('gradient');
          await waitForStability(page, 300);
          await page.keyboard.press('Escape');
          await waitForStability(page, 500);
          await takeScreenshot(page, '16-gradient-background'); // Viewport only for 4:3 ratio

          // 17. Image/Pattern background
          console.log('\n📸 Capturing pattern background...');
          await bgButton.click({ timeout: 5000 });
          await bgDropdown.waitFor({ state: 'visible', timeout: 5000 });
          await waitForStability(page, 300);
          await page.locator('select.form-select').first().selectOption('geopattern');
          await waitForStability(page, 300);
          await page.keyboard.press('Escape');
          await waitForStability(page, 500);
          await takeScreenshot(page, '17-pattern-background'); // Viewport only for 4:3 ratio

          // Reset to theme background
          await bgButton.click({ timeout: 5000 });
          await bgDropdown.waitFor({ state: 'visible', timeout: 5000 });
          await waitForStability(page, 300);
          await page.locator('select.form-select').first().selectOption('theme');
          await waitForStability(page, 300);
          await page.keyboard.press('Escape');
          await waitForStability(page, 300);
        } catch (e) {
          console.log(`Failed to capture background variations: ${e.message}`);
          console.log('Skipping background variation screenshots');
        }
      }
    } else {
      console.log('\n⏭️  Skipping different background variations (not available)');
    }

    // 18. Mobile view - Portrait
    console.log('\n📸 Capturing mobile view (portrait)...');
    await page.setViewportSize({ width: 375, height: 812 });
    await waitForStability(page, 1500); // Wait for responsive layout to adjust

    // Verify we're still on the right page, navigate back if needed
    let currentUrl = page.url();
    console.log('Current URL (mobile):', currentUrl);
    if (!currentUrl.includes('localhost:8080') && !currentUrl.startsWith(APP_URL)) {
      console.log('⚠️  Page navigated away, returning to app...');
      await page.goto(APP_URL);
      await waitForStability(page, 2500); // Wait longer after navigation
      currentUrl = page.url();
      console.log('After navigation:', currentUrl);
    }

    await takeScreenshot(page, '18-mobile-portrait', { fullPage: true });

    // 19. Mobile view - Spotlight search
    console.log('\n📸 Capturing mobile spotlight search...');
    await page.keyboard.press('/');
    await waitForStability(page, 1200); // Wait for search modal on mobile

    // Check if search opened
    const searchVisible = await page.locator('input[placeholder*="Search"]').isVisible().catch(() => false);
    if (searchVisible) {
      await takeScreenshot(page, '19-mobile-search');
      await page.keyboard.press('Escape');
      await waitForStability(page, 500);
    } else {
      console.log('⚠️  Spotlight search not visible on mobile, skipping...');
    }

    // 20. Tablet view
    console.log('\n📸 Capturing tablet view...');
    await page.setViewportSize({ width: 768, height: 1024 });
    await waitForStability(page, 1500); // Wait for responsive layout to adjust

    // Verify we're still on the right page
    let tabletUrl = page.url();
    console.log('Current URL (tablet):', tabletUrl);
    if (!tabletUrl.includes('localhost:8080') && !tabletUrl.startsWith(APP_URL)) {
      console.log('⚠️  Page navigated away, returning to app...');
      await page.goto(APP_URL);
      await waitForStability(page, 2500); // Wait longer after navigation
      tabletUrl = page.url();
      console.log('After navigation:', tabletUrl);
    }

    await takeScreenshot(page, '20-tablet-view', { fullPage: true });

    // 21. Dark theme (desktop)
    console.log('\n📸 Capturing dark theme...');
    await page.setViewportSize({ width: 1600, height: 1200 }); // 4:3 aspect ratio
    await waitForStability(page, 1000); // Wait for viewport change

    // Navigate back to app if needed
    let desktopUrl = page.url();
    console.log('Current URL (desktop):', desktopUrl);
    if (!desktopUrl.includes('localhost:8080') && !desktopUrl.startsWith(APP_URL)) {
      console.log('⚠️  Page navigated away, returning to app...');
      await page.goto(APP_URL);
      await waitForStability(page, 2000);
      desktopUrl = page.url();
      console.log('After navigation:', desktopUrl);
    }

    // Set dark theme via local storage and reload
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
    });
    await page.reload();
    await waitForStability(page, 3000); // Wait longer for dark theme to fully apply

    // Verify URL after reload
    const darkThemeUrl = page.url();
    console.log('URL after dark theme reload:', darkThemeUrl);

    await takeScreenshot(page, '21-dark-theme', { fullPage: true });

    // 22. Dark theme with spotlight search
    console.log('\n📸 Capturing dark theme with search...');
    try {
      await page.keyboard.press('/');
      await waitForStability(page, 1200); // Wait longer for spotlight to appear

      const searchInput = page.locator('input[placeholder*="Search"]');
      await searchInput.waitFor({ state: 'visible', timeout: 5000 });
      await searchInput.fill('vault');
      await waitForStability(page, 500);
      await takeScreenshot(page, '22-dark-theme-search');
    } catch (e) {
      console.log(`Failed to capture dark theme search: ${e.message}`);
      console.log('Skipping dark theme search screenshot');
    }

    console.log('\n✅ All screenshots captured successfully!');
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);

  } catch (error) {
    console.error('\n❌ Error capturing screenshots:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the screenshot capture
captureScreenshots().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
