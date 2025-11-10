/**
 * Capture a diagonal split screenshot showing light theme (top-left) and dark theme (bottom-right)
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_URL = 'http://localhost:8080';
const SCREENSHOT_DIR = path.join(__dirname, '../../../screenshots');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function waitForStability(page, timeout = 2000) {
  await page.waitForLoadState('networkidle', { timeout: 30000 });
  await page.waitForTimeout(timeout);
}

async function captureWithDiagonalSplit() {
  console.log('🚀 Starting diagonal theme split screenshot capture...\n');
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-web-security'] // Allow canvas operations
  });
  
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1200 },
    deviceScaleFactor: 1,
  });
  
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => console.log('Browser:', msg.text()));
  page.on('pageerror', err => console.error('Page Error:', err));
  
  try {
    console.log('📱 Navigating to application...');
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await waitForStability(page, 3000);
    
    // Capture light theme
    console.log('📸 Capturing light theme...');
    await page.evaluate(() => {
      localStorage.setItem('theme', 'light');
    });
    await page.reload();
    await waitForStability(page, 3000);
    
    const lightScreenshot = await page.screenshot({ fullPage: false });
    
    // Capture dark theme
    console.log('📸 Capturing dark theme...');
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
    });
    await page.reload();
    await waitForStability(page, 3000);
    
    const darkScreenshot = await page.screenshot({ fullPage: false });
    
    // Create composite image with diagonal split using canvas
    console.log('🎨 Creating diagonal split composite...');
    const compositeBuffer = await page.evaluate(async ({ light, dark, width, height }) => {
      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      // Load light theme image
      const lightImg = new Image();
      await new Promise((resolve) => {
        lightImg.onload = resolve;
        lightImg.src = 'data:image/png;base64,' + light;
      });
      
      // Load dark theme image
      const darkImg = new Image();
      await new Promise((resolve) => {
        darkImg.onload = resolve;
        darkImg.src = 'data:image/png;base64,' + dark;
      });
      
      // Draw dark theme as base (bottom-right)
      ctx.drawImage(darkImg, 0, 0, width, height);
      
      // Create diagonal clipping path for light theme (top-left)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0); // Top-left corner
      ctx.lineTo(width, 0); // Top-right corner
      ctx.lineTo(0, height); // Bottom-left corner
      ctx.closePath();
      ctx.clip();
      
      // Draw light theme in clipped region
      ctx.drawImage(lightImg, 0, 0, width, height);
      ctx.restore();
      
      // Draw diagonal divider line
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 3;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(width, 0);
      ctx.stroke();
      
      // Add theme labels
      ctx.shadowColor = 'transparent';
      ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
      
      // Light theme label (top-left)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(20, 20, 160, 40);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Light Theme', 30, 48);
      
      // Dark theme label (bottom-right)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(width - 180, height - 60, 160, 40);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Dark Theme', width - 170, height - 32);
      
      // Convert to base64
      return canvas.toDataURL('image/png').split(',')[1];
    }, {
      light: lightScreenshot.toString('base64'),
      dark: darkScreenshot.toString('base64'),
      width: 1600,
      height: 1200
    });
    
    // Save composite image
    const outputPath = path.join(SCREENSHOT_DIR, '00-theme-comparison.png');
    fs.writeFileSync(outputPath, Buffer.from(compositeBuffer, 'base64'));
    
    console.log(`✅ Saved: ${outputPath}`);
    console.log('\n✨ Diagonal split screenshot complete!');
    
  } catch (error) {
    console.error('\n❌ Error during screenshot capture:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the capture
captureWithDiagonalSplit().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
