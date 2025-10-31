import { chromium } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const APP_URL = process.env.APP_URL || 'http://localhost:8080';
const SCREENSHOT_DIR = join(__dirname, 'screenshots');

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
async function waitForStability(page, timeout = 1000) {
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
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  
  const page = await context.newPage();
  
  try {
    // 1. Main application view
    console.log('\n📸 Capturing main application view...');
    await page.goto(APP_URL);
    await waitForStability(page, 2000);
    await takeScreenshot(page, '01-main-view', { fullPage: true });
    
    // 2. Applications view with groups
    console.log('\n📸 Capturing applications with groups...');
    await page.click('a:has-text("Applications")');
    await waitForStability(page);
    await takeScreenshot(page, '02-applications-view', { fullPage: true });
    
    // 3. Bookmarks view
    console.log('\n📸 Capturing bookmarks view...');
    await page.click('a:has-text("Bookmarks")');
    await waitForStability(page);
    await takeScreenshot(page, '03-bookmarks-view', { fullPage: true });
    
    // 4. Spotlight Search - Opening
    console.log('\n📸 Capturing spotlight search...');
    await page.click('a:has-text("Applications")');
    await waitForStability(page);
    await page.keyboard.press('/');
    await waitForStability(page, 500);
    await takeScreenshot(page, '04-spotlight-search-open');
    
    // 5. Spotlight Search - With query
    console.log('\n📸 Capturing spotlight search with results...');
    await page.fill('input[placeholder*="Search"]', 'grafana');
    await waitForStability(page, 500);
    await takeScreenshot(page, '05-spotlight-search-results');
    
    // Close search
    await page.keyboard.press('Escape');
    await waitForStability(page, 300);
    
    // 6. Layout Settings
    console.log('\n📸 Capturing layout settings...');
    await page.click('button[aria-label="Layout settings"]');
    await waitForStability(page, 500);
    await takeScreenshot(page, '06-layout-settings');
    
    // Close by clicking elsewhere
    await page.click('main');
    await waitForStability(page, 300);
    
    // 7. Background Settings - Theme view
    console.log('\n📸 Capturing background settings...');
    await page.click('button[aria-label="Background settings"]');
    await waitForStability(page, 500);
    await takeScreenshot(page, '07-background-settings-theme');
    
    // 8. Background Settings - Solid color
    await page.selectOption('select', 'solid');
    await waitForStability(page, 500);
    await takeScreenshot(page, '08-background-settings-solid');
    
    // 9. Background Settings - Gradient
    await page.selectOption('select', 'gradient');
    await waitForStability(page, 500);
    await takeScreenshot(page, '09-background-settings-gradient');
    
    // Close by clicking elsewhere
    await page.click('main');
    await waitForStability(page, 300);
    
    // 10. Accessibility Settings
    console.log('\n📸 Capturing accessibility settings...');
    await page.click('button[aria-label="Accessibility settings"]');
    await waitForStability(page, 500);
    await takeScreenshot(page, '10-accessibility-settings');
    
    // 11. Accessibility - Increased font size
    console.log('\n📸 Capturing increased font size...');
    await page.click('button[aria-label="Increase font size"]');
    await page.click('button[aria-label="Increase font size"]');
    await waitForStability(page, 500);
    await takeScreenshot(page, '11-accessibility-large-font');
    
    // Reset font size
    await page.click('button[aria-label="Reset font size"]');
    await waitForStability(page, 300);
    
    // 12. Accessibility - High contrast mode
    console.log('\n📸 Capturing high contrast mode...');
    await page.click('button[aria-label="Toggle high contrast"]');
    await waitForStability(page, 500);
    await takeScreenshot(page, '12-accessibility-high-contrast', { fullPage: true });
    
    // Close accessibility panel
    await page.click('main');
    await waitForStability(page, 300);
    
    // 13. High contrast with main view
    console.log('\n📸 Capturing high contrast main view...');
    await takeScreenshot(page, '13-high-contrast-main-view', { fullPage: true });
    
    // 14. High contrast with spotlight search
    console.log('\n📸 Capturing high contrast spotlight search...');
    await page.keyboard.press('/');
    await waitForStability(page, 500);
    await page.fill('input[placeholder*="Search"]', 'monitoring');
    await waitForStability(page, 500);
    await takeScreenshot(page, '14-high-contrast-search');
    
    // Close search
    await page.keyboard.press('Escape');
    await waitForStability(page, 300);
    
    // Reset high contrast for next screenshots
    await page.click('button[aria-label="Accessibility settings"]');
    await waitForStability(page, 300);
    await page.click('button[aria-label="Toggle high contrast"]');
    await waitForStability(page, 300);
    await page.click('main');
    await waitForStability(page, 300);
    
    // 15. Different background - Solid color with applications
    console.log('\n📸 Capturing solid color background...');
    await page.click('button[aria-label="Background settings"]');
    await waitForStability(page, 300);
    await page.selectOption('select', 'solid');
    await waitForStability(page, 300);
    // Change color
    await page.fill('input[type="color"]', '#2c3e50');
    await waitForStability(page, 500);
    await page.click('main');
    await waitForStability(page, 500);
    await takeScreenshot(page, '15-solid-background', { fullPage: true });
    
    // 16. Gradient background
    console.log('\n📸 Capturing gradient background...');
    await page.click('button[aria-label="Background settings"]');
    await waitForStability(page, 300);
    await page.selectOption('select', 'gradient');
    await waitForStability(page, 300);
    await page.click('main');
    await waitForStability(page, 500);
    await takeScreenshot(page, '16-gradient-background', { fullPage: true });
    
    // 17. Image/Pattern background
    console.log('\n📸 Capturing pattern background...');
    await page.click('button[aria-label="Background settings"]');
    await waitForStability(page, 300);
    await page.selectOption('select', 'pattern');
    await waitForStability(page, 300);
    await page.click('main');
    await waitForStability(page, 500);
    await takeScreenshot(page, '17-pattern-background', { fullPage: true });
    
    // Reset to theme background
    await page.click('button[aria-label="Background settings"]');
    await waitForStability(page, 300);
    await page.selectOption('select', 'theme');
    await waitForStability(page, 300);
    await page.click('main');
    await waitForStability(page, 300);
    
    // 18. Mobile view - Portrait
    console.log('\n📸 Capturing mobile view (portrait)...');
    await page.setViewportSize({ width: 375, height: 812 });
    await waitForStability(page, 1000);
    await takeScreenshot(page, '18-mobile-portrait', { fullPage: true });
    
    // 19. Mobile view - Spotlight search
    console.log('\n📸 Capturing mobile spotlight search...');
    await page.keyboard.press('/');
    await waitForStability(page, 500);
    await takeScreenshot(page, '19-mobile-search');
    await page.keyboard.press('Escape');
    
    // 20. Tablet view
    console.log('\n📸 Capturing tablet view...');
    await page.setViewportSize({ width: 768, height: 1024 });
    await waitForStability(page, 1000);
    await takeScreenshot(page, '20-tablet-view', { fullPage: true });
    
    // 21. Dark theme (desktop)
    console.log('\n📸 Capturing dark theme...');
    await page.setViewportSize({ width: 1920, height: 1080 });
    await waitForStability(page, 500);
    
    // Set dark theme via local storage and reload
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
    });
    await page.reload();
    await waitForStability(page, 2000);
    await takeScreenshot(page, '21-dark-theme', { fullPage: true });
    
    // 22. Dark theme with spotlight search
    console.log('\n📸 Capturing dark theme with search...');
    await page.keyboard.press('/');
    await waitForStability(page, 500);
    await page.fill('input[placeholder*="Search"]', 'vault');
    await waitForStability(page, 500);
    await takeScreenshot(page, '22-dark-theme-search');
    
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
