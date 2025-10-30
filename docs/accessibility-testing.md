# Accessibility Testing Guide

This document describes the automated accessibility testing setup for Startpunkt.

## Overview

Startpunkt uses **jest-axe** for automated WCAG 2.1 Level AA compliance testing. The test suite includes:

- Automated axe-core violation detection
- Keyboard navigation testing
- Focus management verification
- ARIA attribute validation
- Screen reader compatibility checks

## Test Utilities

### Location
`src/main/webui/src/test-utils/a11y.js`

### Available Helpers

#### `expectNoA11yViolations(container, config)`
Runs axe-core against a component and asserts no violations.

```javascript
test('should have no accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  await expectNoA11yViolations(container);
});
```

#### `expectKeyboardFocusable(element)`
Verifies an element can receive keyboard focus.

```javascript
test('button is keyboard focusable', () => {
  const button = screen.getByRole('button');
  expectKeyboardFocusable(button);
});
```

#### `expectAccessibleName(element)`
Ensures an element has an accessible name via aria-label, text content, or other means.

```javascript
test('element has accessible name', () => {
  const button = screen.getByRole('button');
  expectAccessibleName(button);
});
```

#### `expectVisibleFocus(element)`
Verifies focus indicator is visible (outline, box-shadow, or border).

```javascript
test('focus indicator is visible', () => {
  const link = screen.getByRole('link');
  expectVisibleFocus(link);
});
```

#### `expectProperHeadingOrder(container)`
Validates heading hierarchy (h1 → h2 → h3, no skipping levels).

```javascript
test('heading order is correct', () => {
  const { container } = render(<MyComponent />);
  expectProperHeadingOrder(container);
});
```

#### `pressKey(element, key, options)`
Simulates keyboard events for testing.

```javascript
test('Enter key activates button', () => {
  const button = screen.getByRole('button');
  pressKey(button, 'Enter');
  expect(onClickMock).toHaveBeenCalled();
});
```

#### `findLiveRegions(container)`
Returns all ARIA live regions for screen reader announcement testing.

## Test Coverage

### AccessibilitySettings Component
- ✅ No axe violations (modal closed and open)
- ✅ All interactive elements have accessible names
- ✅ All interactive elements are keyboard focusable
- ✅ Keyboard navigation (Enter, Escape, Space)
- ✅ Focus trap within modal
- ✅ Focus return to trigger button on close
- ✅ Correct ARIA roles and attributes

### SpotlightSearch Component
- ✅ No axe violations (closed and with results)
- ✅ Search input has accessible label
- ✅ Keyboard navigation (Arrow keys, Enter, Escape)
- ✅ Screen reader announcements for results
- ✅ Proper ARIA roles for results list

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
cd src/main/webui && npm run dev

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- AccessibilitySettings.test.jsx
```

## WCAG 2.1 AA Rules Tested

The axe configuration in `a11y.js` tests for:

- **Color contrast** (4.5:1 ratio for normal text)
- **Valid ARIA attributes and roles**
- **Button and link accessible names**
- **Image alt text**
- **Form field labels**
- **Keyboard accessibility**
- **Focus visibility**
- **Heading hierarchy**
- **Landmark regions**
- **Language attributes**
- **Tab order**

## Adding Tests to New Components

When creating a new interactive component:

1. **Import test utilities**
   ```javascript
   import { expectNoA11yViolations } from './test-utils/a11y';
   ```

2. **Add basic axe test**
   ```javascript
   test('should have no accessibility violations', async () => {
     const { container } = render(<MyComponent />);
     await expectNoA11yViolations(container);
   });
   ```

3. **Test keyboard interactions**
   ```javascript
   test('keyboard navigation works', () => {
     render(<MyComponent />);
     const button = screen.getByRole('button');
     fireEvent.keyDown(button, { key: 'Enter' });
     expect(/* assertion */);
   });
   ```

4. **Verify accessible names**
   ```javascript
   test('elements have accessible names', () => {
     render(<MyComponent />);
     const button = screen.getByRole('button');
     expectAccessibleName(button);
   });
   ```

5. **Test focus management**
   ```javascript
   test('focus is managed correctly', () => {
     render(<MyComponent />);
     const button = screen.getByRole('button');
     button.focus();
     expect(document.activeElement).toBe(button);
   });
   ```

## CI/CD Integration

Tests run automatically via Maven:

```bash
./mvnw verify
```

This executes:
1. Java/Quarkus tests
2. Frontend Jest tests (including accessibility)
3. Checkstyle and Spotless
4. Dependency analysis

## Best Practices

1. **Test early and often** - Add a11y tests when creating components
2. **Test all states** - Closed, open, loading, error states
3. **Test keyboard navigation** - Tab, Enter, Space, Arrow keys, Escape
4. **Test focus management** - Where does focus go? Does it trap properly?
5. **Test ARIA** - Verify roles, states, and properties
6. **Test with real tools** - Automated tests catch ~30-40% of issues; manual testing with screen readers is still essential

## Manual Testing

Automated tests complement but don't replace manual testing:

- **Screen readers**: NVDA (Windows), JAWS (Windows), VoiceOver (macOS)
- **Keyboard only**: Unplug mouse, navigate entire app
- **High contrast mode**: Windows High Contrast, browser extensions
- **Zoom**: Test at 200% and 400% zoom levels
- **Browser tools**: Chrome DevTools Accessibility panel, axe DevTools extension

## Resources

- [jest-axe documentation](https://github.com/nickcolley/jest-axe)
- [axe-core rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Testing Library Accessibility](https://testing-library.com/docs/queries/about/#priority)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)

## Troubleshooting

### "toHaveNoViolations is not a function"
Ensure `jest-axe` is installed and imported in your test:
```javascript
import { expectNoA11yViolations } from './test-utils/a11y';
```

### False positives
If axe reports a violation that isn't applicable:
```javascript
await expectNoA11yViolations(container, {
  rules: {
    'specific-rule': { enabled: false }
  }
});
```

### Performance issues
Axe tests can be slow. Run them separately if needed:
```bash
npm test -- --testNamePattern="Accessibility compliance"
```

## Contributing

When submitting PRs with UI changes:
1. Add or update accessibility tests
2. Run full test suite: `./mvnw verify`
3. Test manually with keyboard navigation
4. Document any accessibility considerations
