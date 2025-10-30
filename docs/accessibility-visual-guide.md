# Accessibility Features Demonstration

## Visual Guide to New Features

### 1. Accessibility Settings Button

The new accessibility settings button appears in the bottom-right corner, to the left of the existing settings buttons.

**Icon**: Universal Access symbol (represented as a person with arms outstretched)
**Location**: Bottom-right corner, leftmost of the settings cluster

### 2. Accessibility Settings Panel

When clicked, the panel opens showing:

```
┌─────────────────────────────────────┐
│  Accessibility Settings             │
├─────────────────────────────────────┤
│                                     │
│  Font Size: 100%                    │
│  ┌─────┐ ┌───────┐ ┌─────┐        │
│  │ A-  │ │ Reset │ │ A+  │        │
│  └─────┘ └───────┘ └─────┘        │
│  [=========|=============]          │
│   75%                       200%   │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  ☐ High Contrast Mode              │
│  Enhances color contrast for       │
│  better readability                │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Keyboard Shortcuts                │
│  • Ctrl + +  Increase font         │
│  • Ctrl + -  Decrease font         │
│  • Ctrl + 0  Reset font            │
│  • /         Search                │
│  • Tab       Navigate forward      │
│  • Shift+Tab Navigate back         │
│                                     │
└─────────────────────────────────────┘
```

### 3. High Contrast Mode

When enabled, the interface transforms to use:
- **Background**: Pure black (#000000)
- **Text**: Pure white (#FFFFFF)
- **Accents**: Bright yellow (#FFFF00)
- **Borders**: White with 2px thickness
- **Focus indicators**: 4px yellow outline

### 4. Focus Indicators

All interactive elements now show visible focus:

**Normal Mode**:
```
┌──────────────────┐
│  Application     │  ← No focus
└──────────────────┘

┏━━━━━━━━━━━━━━━━━━┓
┃  Application     ┃  ← Focused (3px blue outline)
┗━━━━━━━━━━━━━━━━━━┛
```

**High Contrast Mode**:
```
┏━━━━━━━━━━━━━━━━━━┓
┃  Application     ┃  ← Focused (4px yellow outline)
┗━━━━━━━━━━━━━━━━━━┛
```

### 5. Skip to Content Link

When tabbing from the top of the page, a skip link appears:

```
┌─────────────────────────────────────┐
│ [Skip to main content]              │
└─────────────────────────────────────┘
         (visible when focused)
```

### 6. Search Dialog (Press /)

The search now has enhanced ARIA labels:

```
┌─────────────────────────────────────┐
│ Search applications and bookmarks   │
│ ┌─────────────────────────────────┐│
│ │ Search...                       ││
│ └─────────────────────────────────┘│
│                                     │
│ Search results                      │
│ ┌─────────────────────────────────┐│
│ │ 📱 App Name        [App]        ││ ← Selected
│ │    Group – Description          ││
│ ├─────────────────────────────────┤│
│ │ 🔖 Bookmark        [Bookmark]   ││
│ │    Group – Description          ││
│ └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### 7. Application Groups with ARIA

Groups are now collapsible buttons with proper ARIA:

```
▼ Group Name                          (role="button" aria-expanded="true")
├─ Application 1   (role="article")
├─ Application 2   (role="article")
└─ Application 3   (role="article")
```

When collapsed:
```
▶ Group Name                          (role="button" aria-expanded="false")
```

### 8. Font Size Examples

**75% (Smallest)**
```
Small Text Example
Application Name
Description text here
```

**100% (Default)**
```
Default Text Example
Application Name
Description text here
```

**150% (Larger)**
```
Larger Text Example
Application Name
Description text here
```

**200% (Largest)**
```
Largest Text Example
Application Name
Description text here
```

## Keyboard Navigation Flow

1. **Tab** → Skip to content link (appears)
2. **Tab** → Applications/Bookmarks navigation
3. **Tab** → First group header
4. **Enter/Space** → Toggle group collapse
5. **Tab** → First application in group
6. **Tab** → Next application
7. **/** → Opens search dialog
8. **Arrow Keys** → Navigate search results
9. **Enter** → Open selected item
10. **Escape** → Close search

## Screen Reader Announcements

### On page load:
> "Startpunkt, main navigation, Applications, Bookmarks"

### When opening search:
> "Dialog, Search applications and bookmarks, Search, edit text"

### When typing in search:
> "3 results found" (announced via aria-live)

### When selecting an application:
> "Application: Example App - Description text, link"

### When toggling high contrast:
> "High Contrast Mode, checkbox, checked"

## Testing Checklist

- ✅ All interactive elements reachable via Tab
- ✅ Enter/Space activate buttons
- ✅ Escape closes modals
- ✅ Arrow keys navigate lists
- ✅ Focus visible on all elements
- ✅ High contrast mode changes colors
- ✅ Font size changes affect all text
- ✅ Skip link appears when focused
- ✅ Screen readers announce all elements
- ✅ ARIA labels describe purpose
- ✅ Live regions announce updates
- ✅ No keyboard traps

## Technical Implementation

### ARIA Attributes Used
- `role="banner"` - Header
- `role="navigation"` - Navigation menu
- `role="main"` - Main content area
- `role="contentinfo"` - Footer
- `role="dialog"` - Search modal
- `role="button"` - Collapsible headers
- `role="list"` / `role="listitem"` - Groups
- `role="article"` - Application/Bookmark cards
- `role="status"` - Status messages
- `aria-label` - Descriptive labels
- `aria-labelledby` - Label references
- `aria-expanded` - Collapse state
- `aria-controls` - Related elements
- `aria-live="polite"` - Dynamic updates
- `aria-modal="true"` - Modal dialogs

### CSS Classes
- `.visually-hidden-focusable` - Skip links
- `.high-contrast` - High contrast styles
- `*:focus-visible` - Focus indicators

### LocalStorage Keys
- `accessibility-fontSize` - Font size percentage
- `accessibility-highContrast` - Boolean flag
