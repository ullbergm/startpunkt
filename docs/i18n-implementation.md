# Internationalization (i18n) Implementation

## Overview

This document describes the comprehensive internationalization implementation added to Startpunkt, enabling full multi-language support across all UI components.

## Supported Languages

- **English (en-US)** - Default language
- **Swedish (sv-SE)** - Full translation

## Translation Coverage

### 1. Home Section (`home.*`)

- Navigation items (Applications, Bookmarks)
- Theme controls (Light, Dark, Auto)
- Loading states
- Empty states
- Skip to content (accessibility)

### 2. Background Settings (`background.*`)

- Settings panel title and labels
- Background types (Theme, Solid, Gradient, Image, Picture of the Day, Geopattern)
- Theme mode selection
- Color controls
- Gradient direction options
- Image URL configuration
- Pattern settings
- Blur and opacity controls

### 3. Layout Settings (`layout.*`)

- Layout configuration panel
- Column count controls
- Spacing options (Tight, Normal, Relaxed)
- Compact mode toggle
- Visibility options (Description, Tags, Status Indicators)
- Preset management (Save, Load, Delete)

### 4. Accessibility Settings (`accessibility.*`)

- Accessibility panel title
- Font size controls
- High contrast mode
- Keyboard shortcuts reference

### 5. Search (`search.*`)

- Search placeholder text
- No results message
- Result type badges (App, Bookmark)
- ARIA labels for screen readers

## Implementation Details

### Translation Files

Both language files follow the same structure:

```text
src/main/resources/i8n/
├── en-US.json    # English translations
└── sv-SE.json    # Swedish translations
```

### Updated Components

All major UI components have been internationalized:

1. **BackgroundSettings.jsx** - Complete background customization UI
2. **LayoutSettings.jsx** - Layout configuration controls
3. **AccessibilitySettings.jsx** - Accessibility options
4. **app.jsx** - Main application shell, navigation, loading/empty states
5. **SpotlightSearch.jsx** - Search interface and results

### Usage Pattern

Components use the `<Text>` component from `preact-i18n`:

```jsx
import { Text } from 'preact-i18n';

// Simple text
<Text id="home.applications">Applications</Text>

// With fallback
<Text id="home.loading">Loading...</Text>
```

### Language Detection

The application automatically detects the user's browser language:

```javascript
var lang = navigator.language;  // e.g., "en-US", "sv-SE"
fetch('/api/i8n/' + lang)
  .then((res) => res.json())
  .then(setDefinition)
```

## Adding New Translations

### 1. Add Keys to JSON Files

Edit both `en-US.json` and `sv-SE.json`:

```json
{
  "section": {
    "newKey": "English text",
    "anotherKey": "More text"
  }
}
```

### 2. Use in Components

```jsx
import { Text } from 'preact-i18n';

<Text id="section.newKey">English text</Text>
```

### 3. For Attributes

When you need translated text in HTML attributes (like `title`, `placeholder`, `aria-label`), you have a few options:

```jsx
// For simple cases, use the Text component inline
title={<Text id="key">Fallback</Text>}

// For more complex cases, use withText HOC or useText hook
```

## Best Practices

1. **Keep keys organized** - Use dot notation to group related translations
2. **Provide fallback text** - Always include fallback text in case translation is missing
3. **Consistent naming** - Use camelCase for multi-word keys
4. **Context matters** - Include enough context in key names to understand usage
5. **Test both languages** - Verify layout with both English and Swedish text

## Translation Guidelines

When adding Swedish translations:

1. **Maintain formality** - Use "du" form (informal but professional)
2. **Be concise** - Swedish translations should be similar length to English
3. **Technical terms** - Some terms like "App", "Layout" are commonly used in Swedish
4. **UI conventions** - Follow Swedish UI conventions for buttons/controls

## Future Enhancements

Potential improvements for the i18n system:

1. **Additional languages** - Add more language files (de-DE, fr-FR, es-ES, etc.)
2. **Language selector** - Add UI control to switch languages manually
3. **Pluralization** - Add support for plural forms
4. **Date/time formatting** - Localized date and time displays
5. **Number formatting** - Localized number formatting (decimals, thousands)
6. **RTL support** - Right-to-left language support
7. **Dynamic loading** - Only load the active language file
8. **Translation management** - Integration with translation management tools

## Testing

To test translations:

1. **Change browser language** - Set browser to Swedish (sv-SE) or English (en-US)
2. **Verify API endpoint** - Check `/api/i8n/sv-SE` returns correct translations
3. **Visual inspection** - Ensure text fits properly in UI components
4. **Screen reader** - Test with screen readers in both languages
5. **All components** - Open all settings panels and verify translations

## Performance Impact

- **Bundle size**: Each language file adds ~5-7KB (minified)
- **Initial load**: No impact - language fetched after app loads
- **Runtime**: Minimal - translations cached in memory
- **Network**: Single request per language (~2-3KB gzipped)

## Maintenance

When updating UI components:

1. Check if new user-facing text is added
2. Add translation keys to both language files
3. Update this documentation if adding new sections
4. Test with both languages before committing
5. Use `./mvnw verify` to ensure build succeeds

## Related Documentation

- [Accessibility Guide](accessibility.md) - Accessibility features that benefit from i18n
- [Contributing Guide](CONTRIBUTING.md) - How to contribute translations
- [API Documentation](../README.md) - Backend i18n endpoint documentation
