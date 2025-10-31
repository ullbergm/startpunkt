# Startpunkt Feature Screenshots

This directory contains automatically generated screenshots of Startpunkt's features. These screenshots are captured monthly by the [Capture Feature Screenshots workflow](../../../.github/workflows/capture-screenshots.yml) and used in documentation.

## Available Screenshots

Screenshots demonstrate the following features:

### Core Features
- **Main View** - Landing page with application overview
- **Applications View** - Applications organized by groups/namespaces
- **Bookmarks View** - Quick links and bookmarks

### Interactive Features
- **Spotlight Search** - Fast search across all applications and bookmarks
- **Layout Settings** - Customizable layout options
- **Background Settings** - Multiple background themes (auto theme, solid color, gradient, pattern)

### Accessibility Features
- **Accessibility Settings** - Font size controls and high contrast mode
- **Large Font** - Demonstration of increased font sizes (75%-200%)
- **High Contrast Mode** - WCAG-compliant high contrast theme

### Responsive Design
- **Mobile Portrait** - Mobile-optimized layout (375x812)
- **Tablet View** - Tablet-optimized layout (768x1024)
- **Desktop View** - Full desktop experience (1920x1080)

### Themes
- **Light Theme** - Default light color scheme
- **Dark Theme** - Dark color scheme for reduced eye strain

## Updating Screenshots

Screenshots are automatically updated on the 1st of each month. To manually update:

1. Go to [Actions → Capture Feature Screenshots](https://github.com/ullbergm/startpunkt/actions/workflows/capture-screenshots.yml)
2. Click "Run workflow"
3. Select "true" for "Commit screenshots to repository"
4. Wait for the workflow to complete

Alternatively, download the latest screenshots from workflow artifacts and manually commit them to this directory.

## Using Screenshots in Documentation

Reference screenshots in markdown documentation like this:

```markdown
![Main View](images/features/01-main-view.png)
![Spotlight Search](images/features/04-spotlight-search-open.png)
```

## Screenshot Naming Convention

Screenshots follow a numbered naming convention:
- `01-*.png` - Main views
- `04-05-*.png` - Search features  
- `06-09-*.png` - Settings panels
- `10-14-*.png` - Accessibility features
- `15-17-*.png` - Background variations
- `18-20-*.png` - Responsive views
- `21-22-*.png` - Theme variations

See the [screenshot scripts README](../../../.github/workflows/screenshot-scripts/README.md) for a complete list.
