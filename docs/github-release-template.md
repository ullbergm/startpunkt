# GitHub Release Template for Startpunkt

This document describes how to format GitHub releases so they can be properly parsed and displayed in the "What's New" modal.

## Overview

Startpunkt's changelog system fetches release notes directly from the [GitHub Releases API](https://api.github.com/repos/ullbergm/startpunkt/releases). The release body (description) is parsed to extract highlights and changes.

## Release Body Format

### Basic Structure

```markdown
## Features
**Feature Title**
Description of the feature

**Another Feature**
Description of another feature

## Improvements
**Improvement Title**
Description of the improvement

## Bug Fixes
**Bug Fix Title**
Description of the bug fix

## Security
**Security Fix Title**
Description of the security fix

## All Changes
- Change item 1
- Change item 2
- Change item 3
```

### Section Types

The parser recognizes the following sections (case-insensitive):

- **## Features** or **## Feature** - New features added
- **## Improvements** or **## Improvement** - Enhancements to existing features
- **## Bug Fixes** or **## Bug Fix** or **## Fixes** or **## Fix** - Bug fixes
- **## Security** - Security-related changes
- **## All Changes** or **## Changes** - Complete list of changes

### Highlight Format

Highlights are extracted from the first four sections (Features, Improvements, Bug Fixes, Security). Each highlight must be formatted as:

```markdown
**Highlight Title**
Description of the highlight
```

- The title must be wrapped in `**bold**` markdown
- The description should be on the next line
- Leave a blank line between highlights

### All Changes Format

The "All Changes" section should contain a bulleted list:

```markdown
## All Changes
- First change item
- Second change item  
- Third change item
```

- Use `-` for bullet points
- One change per line
- Changes will be displayed in a collapsible section in the modal

## Example Release

Here's a complete example:

```markdown
This release includes new skeleton loading animations, enhanced form validation, and improved accessibility features.

## Features
**Tailwind-Inspired Skeleton Loading**
Beautiful shimmer animations during data loading with utility-first styling

**GraphQL Subscriptions**
Real-time updates via WebSocket subscriptions for applications and bookmarks

## Improvements
**Enhanced Form Validation**
Real-time field validation with visual feedback in application and bookmark editors

**Better Keyboard Navigation**
Improved keyboard shortcuts and focus management throughout the application

## Bug Fixes
**Application Editor Dialog**
Fixed issue where dialog would not close after saving changes

**Bookmark Sorting**
Corrected sorting logic to respect location field properly

## Security
**Dependency Updates**
Updated critical dependencies to address security vulnerabilities CVE-2024-XXXX

## All Changes
- Added Tailwind CSS-inspired utility classes
- Implemented skeleton loading components with shimmer animation
- Real-time form validation with field-level error messages
- Visual error states in all form inputs
- Helper text for all form fields
- Changed targetBlank default to false for security
- Standardized class vs className usage across components
- Enhanced dark mode support for skeleton loading
- Improved high contrast mode accessibility
- Support for reduced motion preferences
- Fixed application editor dialog close issue
- Fixed bookmark sorting logic
- Updated dependencies for security patches
```

## Release Metadata

### Version Tag

- Must follow semantic versioning (e.g., `v4.1.0`)
- The `v` prefix is optional but recommended
- Version is displayed prominently in the modal

### Release Date

- Automatically extracted from the `published_at` field
- Displayed in the format: "Released on YYYY-MM-DD"

### Release Status

- **Draft releases** are **excluded** from the changelog
- **Pre-releases** are **excluded** from the changelog
- Only **published releases** are shown

## Caching Behavior

- Release data is cached in localStorage for 1 hour
- Cache key: `startpunkt-changelog-cache`
- Cache includes timestamp for expiration check
- Subsequent page loads use cache if not expired
- This prevents excessive API calls (GitHub rate limit: 60 requests/hour for unauthenticated)

## Fallback Data

If the GitHub API is unavailable (network error, rate limit, etc.), the system uses hardcoded fallback data from `changelogService.js`. This ensures users can always see release notes, even offline.

## Testing Releases

To test how a release will appear:

1. Create a draft release on GitHub
2. Format the body according to this template
3. Publish the release
4. Clear the changelog cache: `localStorage.removeItem('startpunkt-changelog-cache')`
5. Clear the last seen version: `localStorage.removeItem('startpunkt-last-seen-version')`
6. Refresh the application
7. The "What's New" modal should appear with your release

## API Reference

The changelog service provides these functions:

### `fetchChangelog()`

Fetches all releases (up to 10 most recent) from GitHub, caches them, and returns an array of release objects.

```javascript
const changelog = await fetchChangelog();
```

### `getLatestRelease()`

Fetches only the most recent release.

```javascript
const latestRelease = await getLatestRelease();
```

### `clearChangelogCache()`

Clears the changelog cache (useful for testing).

```javascript
clearChangelogCache();
```

## Release Object Structure

The service transforms GitHub release data into this format:

```javascript
{
  version: "4.1.0",           // Semantic version without 'v' prefix
  date: "2025-11-03",          // ISO date (YYYY-MM-DD)
  highlights: [                // Array of highlight objects
    {
      type: "feature",         // 'feature', 'improvement', 'bug-fix', or 'security'
      title: "Feature Title",  // Extracted from **bold** text
      description: "Feature description"
    }
  ],
  allChanges: [                // Array of change strings
    "First change",
    "Second change"
  ]
}
```

## Best Practices

1. **Be concise**: Highlight titles should be 3-7 words
2. **Be descriptive**: Descriptions should explain the value to users
3. **Use highlights wisely**: Include 2-5 highlights, not more
4. **Complete changelog**: The "All Changes" section should be comprehensive
5. **Consistent formatting**: Follow the template exactly for reliable parsing
6. **Test before publishing**: Create a draft, preview, then publish
7. **Version numbers**: Use semantic versioning consistently
8. **User-focused language**: Write for end-users, not developers

## Troubleshooting

### Highlights Not Showing

- Ensure titles are wrapped in `**bold**` markdown
- Check that description is on the line immediately after the title
- Verify section headers use `##` (H2) markdown

### Changes Not Parsing

- Ensure "All Changes" section uses `## All Changes` header
- Use `-` for bullet points, not `*` or `•`
- One change per line

### Version Not Updating

- Clear both caches: `startpunkt-changelog-cache` and `startpunkt-last-seen-version`
- Verify the release is published (not draft or pre-release)
- Check browser console for any API errors

### Modal Not Showing

- Check that the new version is higher than the last seen version
- Verify semantic versioning is correct (major.minor.patch)
- Look for JavaScript errors in the browser console
