# Screenshot Capture Scripts

This directory contains scripts for automatically capturing screenshots of Startpunkt's features for documentation purposes.

## Overview

The screenshot workflow captures images of all major features including:

1. Main application view
2. Applications view with groups
3. Bookmarks view
4. Spotlight search (open and with results)
5. Layout settings panel
6. Background settings (theme, solid, gradient, pattern)
7. Accessibility settings panel
8. Large font size demonstration
9. High contrast mode
10. Mobile and tablet responsive views
11. Dark theme

## Usage

### Manual Workflow Trigger

You can manually trigger the screenshot workflow from the GitHub Actions tab:

1. Go to Actions → "Capture Feature Screenshots"
2. Click "Run workflow"
3. Choose whether to commit screenshots to the repository (default: false)
4. Screenshots will be available as artifacts for 90 days

### Scheduled Execution

The workflow automatically runs monthly (1st of each month at 2am UTC) and commits the screenshots to `docs/images/features/`.

### Local Development

To capture screenshots locally:

```bash
# Navigate to the screenshot scripts directory
cd .github/workflows/screenshot-scripts

# Install dependencies
npm install

# Start your Startpunkt application on port 8080
# In another terminal:
export APP_URL=http://localhost:8080
node capture-screenshots.js
```

Screenshots will be saved to `.github/workflows/screenshot-scripts/screenshots/`.

## Screenshot Files

Screenshots are numbered and named descriptively:

- `01-main-view.png` - Main landing page
- `02-applications-view.png` - Applications organized by groups
- `03-bookmarks-view.png` - Bookmarks view
- `04-spotlight-search-open.png` - Search dialog opened
- `05-spotlight-search-results.png` - Search with results
- `06-layout-settings.png` - Layout configuration panel
- `07-background-settings-theme.png` - Background settings with theme
- `08-background-settings-solid.png` - Solid color background option
- `09-background-settings-gradient.png` - Gradient background option
- `10-accessibility-settings.png` - Accessibility settings panel
- `11-accessibility-large-font.png` - Increased font size
- `12-accessibility-high-contrast.png` - High contrast mode active
- `13-high-contrast-main-view.png` - Full page in high contrast
- `14-high-contrast-search.png` - Search in high contrast mode
- `15-solid-background.png` - Solid background applied
- `16-gradient-background.png` - Gradient background applied
- `17-pattern-background.png` - Pattern background applied
- `18-mobile-portrait.png` - Mobile view (375x812)
- `19-mobile-search.png` - Mobile spotlight search
- `20-tablet-view.png` - Tablet view (768x1024)
- `21-dark-theme.png` - Dark theme applied
- `22-dark-theme-search.png` - Search in dark theme

## Customization

### Adding New Screenshots

To capture additional features:

1. Edit `capture-screenshots.js`
2. Add new screenshot capture steps using the helper functions:
   - `takeScreenshot(page, name, options)` - Capture a screenshot
   - `waitForStability(page, timeout)` - Wait for page to settle
3. Follow the existing numbering and naming conventions

### Modifying Sample Data

The workflow creates sample Kubernetes resources in `.github/workflows/capture-screenshots.yml`:

- Sample applications (Grafana, Prometheus, ArgoCD, Jenkins, Harbor, Vault)
- Sample bookmark groups (Documentation, Development Tools)

Edit the workflow file to modify these resources.

## Requirements

- Node.js 20+
- Playwright (automatically installed by the workflow)
- Running Startpunkt instance on the configured port

## Troubleshooting

### Application fails to start

Check the application logs in the workflow output. Common issues:
- Port 8080 already in use
- Missing dependencies
- Build failure

### Screenshots are blank or incomplete

- Increase wait times in `waitForStability()` calls
- Check that selectors match the current UI structure
- Verify the application is fully loaded before capturing

### Workflow fails on commit

- Ensure the workflow has write permissions
- Check that git configuration is correct
- Verify no conflicting changes exist
