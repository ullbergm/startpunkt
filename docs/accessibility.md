# Accessibility Features

This document describes the comprehensive accessibility features implemented in Startpunkt to ensure an inclusive user experience following WCAG 2.1 guidelines.

## Overview

Startpunkt now includes a full suite of accessibility enhancements designed to support users with disabilities, including:

- Screen reader optimization
- Keyboard-only navigation
- High contrast mode
- Font size controls
- Comprehensive ARIA labels and semantic HTML

## Features

### 1. Accessibility Settings Panel

A dedicated accessibility settings panel is available via a button in the bottom-right corner of the screen (before the layout and background settings).

#### Font Size Controls
- **Increase Font Size**: Make text larger for improved readability
- **Decrease Font Size**: Make text smaller
- **Reset**: Return to default 100% font size
- **Slider**: Fine-tune font size from 75% to 200%

#### High Contrast Mode
Toggle high contrast mode for enhanced color contrast:
- White text on black background
- Yellow accents for links and interactive elements
- Enhanced borders for all UI components
- Stronger focus indicators

### 2. Keyboard Navigation

All interactive elements are fully keyboard accessible:

#### General Navigation
- **Tab**: Move forward through interactive elements
- **Shift + Tab**: Move backward through interactive elements
- **Enter** or **Space**: Activate buttons and toggle groups
- **Escape**: Close modals and dialogs

#### Search Dialog
- **/** (forward slash): Open search dialog from anywhere
- **Arrow Up/Down**: Navigate search results
- **Enter**: Open selected application/bookmark
- **Escape**: Close search dialog

#### Group Collapsing
- **Enter** or **Space**: Expand/collapse application or bookmark groups

### 3. Screen Reader Support

#### ARIA Labels and Roles
- All interactive elements have descriptive `aria-label` attributes
- Proper landmark roles (`banner`, `navigation`, `main`, `contentinfo`)
- Dialog roles for modal overlays
- List and listitem roles for grouped content

#### Live Regions
- Search results announced as `aria-live="polite"`
- Loading and empty states marked with `role="status"`
- Dynamic content updates announced to screen readers

#### Semantic HTML
- Proper heading hierarchy (h1 → h2 → h3)
- Semantic elements (header, nav, main, footer)
- Article role for application/bookmark cards

### 4. Focus Indicators

All interactive elements have visible focus indicators:
- **Default**: 3px blue outline with 2px offset
- **High Contrast Mode**: 4px yellow outline with 3px offset
- Consistent across all components

### 5. Skip to Content Link

A "Skip to main content" link appears at the top of the page when focused, allowing keyboard and screen reader users to bypass navigation and jump directly to the main content.

### 6. Descriptive Links

All links include descriptive text:
- Application links: "ApplicationName - Description"
- Bookmark links: "BookmarkName - Description"
- External links properly marked with `rel="external noopener noreferrer"`

### 7. Status Indicators

Visual and semantic status information:
- Unavailable applications marked with `role="status"`
- Tags presented as lists with proper ARIA structure
- WebSocket connection status with descriptive tooltips

## Testing

### Keyboard-Only Testing
1. Use only `Tab`, `Shift+Tab`, `Enter`, `Space`, and `Escape` keys
2. Verify all functionality is accessible
3. Check that focus indicators are visible
4. Ensure no keyboard traps exist

### Screen Reader Testing
Recommended screen readers:
- **Windows**: NVDA (free) or JAWS
- **Mac**: VoiceOver (built-in)
- **Linux**: Orca

Test checklist:
- [ ] All interactive elements are announced
- [ ] Navigation landmarks are identified
- [ ] Dynamic content changes are announced
- [ ] Forms and controls are properly labeled
- [ ] Search functionality is accessible

### High Contrast Testing
1. Enable high contrast mode in accessibility settings
2. Verify all text is readable
3. Check that interactive elements are distinguishable
4. Ensure focus indicators are visible

## WCAG 2.1 Compliance

This implementation aims to meet WCAG 2.1 Level AA standards:

### Perceivable
- ✅ Text alternatives for icons (via aria-label)
- ✅ Adaptable content (semantic HTML structure)
- ✅ Distinguishable (focus indicators, high contrast mode)

### Operable
- ✅ Keyboard accessible (all functionality via keyboard)
- ✅ Enough time (no time limits on content)
- ✅ Navigable (skip links, landmarks, clear focus)

### Understandable
- ✅ Readable (adjustable font size)
- ✅ Predictable (consistent navigation and behavior)
- ✅ Input assistance (labeled form controls)

### Robust
- ✅ Compatible (valid ARIA usage, semantic HTML)

## Future Enhancements

Potential future accessibility improvements:
- Reduced motion mode for users sensitive to animations
- Custom color themes beyond high contrast
- Text-to-speech for application descriptions
- Keyboard shortcuts customization
- Focus trap management in complex dialogs

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
