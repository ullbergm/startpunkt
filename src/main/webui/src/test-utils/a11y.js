/**
 * Accessibility testing utilities
 * Provides helpers for automated a11y testing with jest-axe
 */

import { axe, toHaveNoViolations } from 'jest-axe';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

/**
 * Default axe configuration for WCAG 2.1 AA compliance
 */
export const axeConfig = {
  rules: {
    // WCAG 2.1 Level A & AA rules
    // Disable color-contrast in JSDOM tests due to canvas limitations
    'color-contrast': { enabled: false },
    'aria-valid-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'button-name': { enabled: true },
    'link-name': { enabled: true },
    'image-alt': { enabled: true },
    label: { enabled: true },
    'aria-hidden-focus': { enabled: true },
    'aria-input-field-name': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-roles': { enabled: true },
    'duplicate-id-aria': { enabled: true },
    'form-field-multiple-labels': { enabled: true },
    'heading-order': { enabled: true },
    'html-has-lang': { enabled: true },
    'html-lang-valid': { enabled: true },
    'landmark-one-main': { enabled: true },
    'page-has-heading-one': { enabled: true },
    region: { enabled: true },
    tabindex: { enabled: true },
  },
};

/**
 * Run axe accessibility tests on a container
 * @param {HTMLElement} container - The DOM container to test
 * @param {Object} config - Optional axe configuration overrides
 * @returns {Promise<Object>} - axe results
 */
export const runAxe = async (container, config = {}) => {
  const results = await axe(container, {
    ...axeConfig,
    ...config,
  });
  return results;
};

/**
 * Assert that a component has no accessibility violations
 * @param {HTMLElement} container - The DOM container to test
 * @param {Object} config - Optional axe configuration overrides
 */
export const expectNoA11yViolations = async (container, config = {}) => {
  const results = await runAxe(container, config);
  expect(results).toHaveNoViolations();
};

/**
 * Test keyboard navigation on an element
 * @param {HTMLElement} element - The element to test
 * @param {string} key - The key to press (e.g., 'Tab', 'Enter', 'Space')
 * @param {Object} options - Additional keyboard event options
 */
export const pressKey = (element, key, options = {}) => {
  const event = new KeyboardEvent('keydown', {
    key,
    code: key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  element.dispatchEvent(event);
};

/**
 * Assert that an element is keyboard focusable
 * @param {HTMLElement} element - The element to test
 */
export const expectKeyboardFocusable = (element) => {
  expect(element).toBeInTheDocument();
  const tabIndex = element.getAttribute('tabindex');
  const isInteractive = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(
    element.tagName
  );
  expect(isInteractive || tabIndex !== '-1').toBe(true);
};

/**
 * Assert that focus indicator is visible
 * @param {HTMLElement} element - The element to test
 */
export const expectVisibleFocus = (element) => {
  element.focus();
  expect(document.activeElement).toBe(element);
  
  // Check for focus styles (outline or custom focus styles)
  const styles = window.getComputedStyle(element);
  const hasOutline = styles.outline !== 'none' && styles.outline !== '0px';
  const hasBoxShadow = styles.boxShadow !== 'none';
  const hasBorder = styles.borderWidth !== '0px';
  
  expect(hasOutline || hasBoxShadow || hasBorder).toBe(true);
};

/**
 * Test ARIA live region announcements
 * @param {HTMLElement} container - The container with live regions
 * @returns {HTMLElement[]} - Array of live region elements
 */
export const findLiveRegions = (container) => {
  return Array.from(
    container.querySelectorAll('[aria-live], [role="status"], [role="alert"]')
  );
};

/**
 * Assert proper heading hierarchy
 * @param {HTMLElement} container - The container to test
 */
export const expectProperHeadingOrder = (container) => {
  const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  const levels = headings.map((h) => parseInt(h.tagName.charAt(1), 10));
  
  for (let i = 1; i < levels.length; i++) {
    const diff = levels[i] - levels[i - 1];
    // Allow same level, one level down, or jump to h1
    expect(diff <= 1 || levels[i] === 1).toBe(true);
  }
};

/**
 * Assert element has accessible name
 * @param {HTMLElement} element - The element to test
 */
export const expectAccessibleName = (element) => {
  const ariaLabel = element.getAttribute('aria-label');
  const ariaLabelledBy = element.getAttribute('aria-labelledby');
  const textContent = element.textContent.trim();
  const alt = element.getAttribute('alt');
  const title = element.getAttribute('title');
  
  expect(
    ariaLabel || ariaLabelledBy || textContent || alt || title
  ).toBeTruthy();
};

export { axe, toHaveNoViolations };
