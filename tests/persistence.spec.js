import { test, expect, bootToDesktop } from './fixtures';

/*
 * The highest-consequence thing this filesystem does: remember.
 *
 * A file created in one session has to survive a reload — which means the
 * whole chain works: markDirty, the 300ms debounce, saveManyMeta into
 * IndexedDB, and then the boot path reading it back and reconciling it
 * against the seed instead of overwriting it.
 *
 * This is the test to have before touching the VFS boot sequence.
 */

test('a file created on the desktop survives a reload', async ({ page }) => {
  await bootToDesktop(page);

  const layer = page.locator('.desktop-icons-layer');
  const newFile = layer.getByText(/New Text Document/);
  await expect(newFile).toHaveCount(0);

  /*
   * Raw mouse events rather than locator.click: the desktop layer never
   * satisfies Playwright's "stable" check, since it re-renders constantly.
   */
  await page.mouse.click(600, 400, { button: 'right' });
  await page.getByText('New', { exact: true }).hover();
  await page.getByText('Text Document', { exact: true }).click();

  // It lands in inline-rename mode; Enter accepts the default name.
  await page.keyboard.press('Enter');
  await expect(newFile).toHaveCount(1);

  /*
   * Writes are debounced before they reach IndexedDB, so give that a beat.
   * Reloading instantly would prove nothing about persistence — only that
   * we can outrun it.
   */
  await page.waitForTimeout(1200);

  await page.reload();

  const tile = page.locator('[data-user="guest"]');
  await tile.waitFor({ state: 'visible' });
  await tile.click();
  await expect(page).toHaveTitle("Guest's Computer");
  await page.locator('.desktop-icons-layer').waitFor({ state: 'visible' });

  // Still there, and still exactly one of it — the seeder must not have
  // re-run over the top or added a duplicate.
  await expect(page.locator('.desktop-icons-layer').getByText(/New Text Document/)).toHaveCount(1);
});
