import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page, request }) => {
  await request.post('/__test/stream?down=false');
  await page.addInitScript(() => {
    localStorage.setItem('startpunkt.preferences', JSON.stringify({ background: { type: 'theme' } }));
  });
  await page.goto('/');
  await expect(page.getByRole('link', { name: /^Grafana/ })).toBeVisible();
});

test('unlocks, creates, updates and deletes through the real edit API and event stream', async ({ page }) => {
  await page.getByRole('button', { name: 'Edit the page', exact: true }).click();
  await page.getByLabel('Edit key', { exact: true }).fill('wrong');
  await page.getByRole('button', { name: 'Unlock', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('That is not the edit key.');
  await page.getByLabel('Edit key', { exact: true }).fill('browser-test-edit-key');
  await page.getByRole('button', { name: 'Unlock', exact: true }).click();
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  const editor = page.getByRole('dialog');
  await editor.getByLabel('Name', { exact: true }).fill('Browser service');
  await editor.getByLabel('Address', { exact: true }).fill('https://browser.example.com');
  await editor.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'Change Browser service', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Name', { exact: true }).fill('Updated service');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'Change Updated service', exact: true }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Yes, delete', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Change Updated service', exact: true })).toHaveCount(0);
});

test('retains tiles during a disconnect and recovers the stream', async ({ page, request }) => {
  try {
    await request.post('/__test/stream?down=true');
    await expect(page.getByText(/Reconnecting/)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('link', { name: /^Grafana/ })).toBeVisible();
  } finally {
    await request.post('/__test/stream?down=false');
  }
  await expect(page.getByText(/Reconnecting/)).toHaveCount(0, {
    timeout: 20_000,
  });
  await expect(page.getByRole('link', { name: /^Grafana/ })).toBeVisible();
});

test('keyboard tabs, modal focus, shortcuts and optional type-to-search', async ({ page }) => {
  const settings = page.getByRole('button', { name: 'Settings', exact: true });
  await settings.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('tab', { name: 'Appearance', exact: true }).focus();
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'Accessibility', exact: true })).toBeFocused();
  await page.getByRole('checkbox', { name: /Open search when typing/ }).uncheck();
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog')).toHaveCount(0);
  await expect(settings).toBeFocused();
  await page.keyboard.press('g');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.keyboard.press('/');
  await expect(page.getByRole('combobox')).toBeFocused();
  await page.getByRole('combobox').fill('Grafana');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('combobox')).toHaveAttribute('aria-activedescendant', 'spotlight-option-0');
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog')).toHaveCount(0);
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('combobox')).toBeFocused();
});

test('font scaling refits a clamped description at a fixed card width', async ({ page }) => {
  await page
    .locator('.tile-info')
    .first()
    .evaluate((el) => {
      (el as HTMLElement).style.width = '220px';
      (el as HTMLElement).style.flex = 'none';
    });
  const text = page.locator('.tile-info .fit').first();
  await expect(text).not.toHaveClass(/fit-cut/);
  // Changing scale must recompute fitting at a fixed description width.
  const before = await text.evaluate((el) => ({
    width: el.clientWidth,
    font: getComputedStyle(el).fontSize,
  }));
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('tab', { name: 'Accessibility', exact: true }).click();
  await page.getByRole('button', { name: 'Increase text size', exact: true }).click({ clickCount: 1 });
  await page.getByRole('button', { name: 'Increase text size', exact: true }).click();
  await page.getByRole('button', { name: 'Increase text size', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect.poll(() => text.evaluate((el) => getComputedStyle(el).fontSize)).not.toBe(before.font);
  expect(await text.evaluate((el) => el.clientWidth)).toBe(before.width);
  const measured = await text.evaluate((el) => ({
    height: el.getBoundingClientRect().height,
    line: parseFloat(getComputedStyle(el).lineHeight),
  }));
  expect(measured.height).toBeLessThanOrEqual(measured.line * 2 + 1);
  await expect(text).toHaveClass(/fit-cut/);
  await expect(text).toHaveAttribute('title', /Dashboards and metrics/);
});

test('visual controls are independent and diagnostics include failed resources', async ({ page }) => {
  await expect(page.locator('.tile-workloads')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Open Grafana in OpenShift' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Documentation', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('tab', { name: 'Tiles', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Show workload readiness', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Show console links', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Show secondary links', exact: true }).uncheck();
  await page.getByRole('checkbox', { name: 'Show diagnostics controls', exact: true }).check();
  await page.keyboard.press('Escape');
  await expect(page.locator('.tile-workloads')).toContainText('2');
  await expect(page.getByRole('link', { name: 'Open Grafana in OpenShift' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Documentation', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Tile diagnostics', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('URL resolution failed');
  await expect(page.getByRole('dialog')).toContainText('broken');
});

test('settings have no visible scrollbars and remain reachable on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings', exact: true });
  expect(await dialog.evaluate((el) => getComputedStyle(el).scrollbarWidth)).toBe('none');
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.getByRole('tab', { name: 'Tiles', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Show diagnostics controls', exact: true }).check();
  await expect(
    page.getByRole('checkbox', {
      name: 'Show diagnostics controls',
      exact: true,
    }),
  ).toBeChecked();
});
