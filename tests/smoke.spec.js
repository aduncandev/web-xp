import {
  test,
  expect,
  bootToDesktop,
  startMenu,
  startButton,
} from './fixtures';

/*
 * The "did that break the desktop" tripwire. Four tests, one machine boot
 * each, covering the paths every change risks: boot and seed, launch and
 * close, focus and z-order, and where the Start menu gets its data.
 */

test('@smoke cold boot reaches a live desktop', async ({ page }) => {
  await bootToDesktop(page);

  // The seeded disk reached the desktop layer.
  await expect(page.getByText('Recycle Bin', { exact: true })).toBeVisible();
  await expect(startButton(page)).toBeVisible();

  // The clock proves the tray mounted and is ticking.
  await expect(page.locator('.footer__time')).toBeVisible();
  await expect(page.locator('.footer__time')).toHaveText(/\d{1,2}:\d{2}/);

  expect(page.__errors, 'no uncaught errors during boot').toEqual([]);
});

test('@smoke launch, minimize, restore and close a program', async ({
  page,
}) => {
  await bootToDesktop(page);
  await startMenu(page, 'Notepad');

  const title = page.locator('.app__header__title', { hasText: 'Notepad' });
  await expect(title).toBeVisible();

  // Minimize: the frame goes away, the taskbar button stays.
  await page.locator('.header__button--minimize').click();
  await expect(title).toBeHidden();

  const taskbarButton = page
    .locator('.footer__window, [class*="footer"] img[alt*="Notepad"]')
    .first();
  await taskbarButton.click();
  await expect(title).toBeVisible();

  await page.locator('.header__button--close').click();
  await expect(title).toHaveCount(0);

  expect(page.__errors).toEqual([]);
});

test('@smoke focus moves between two windows', async ({ page }) => {
  await bootToDesktop(page);

  await startMenu(page, 'Notepad');
  await expect(
    page.locator('.app__header__title', { hasText: 'Notepad' }),
  ).toBeVisible();

  await startMenu(page, 'Minesweeper');
  await expect(
    page.locator('.app__header__title', { hasText: 'Minesweeper' }),
  ).toBeVisible();

  /*
   * The newest window must sit above the older one. Read the stacking
   * straight off the frames rather than trusting a focus class, because
   * z-order is what the user actually sees.
   */
  const zOf = async name => {
    return page.evaluate(label => {
      const titles = [...document.querySelectorAll('.app__header__title')];
      const el = titles.find(t => t.textContent.includes(label));
      if (!el) return null;
      const frame =
        el.closest('[style*="z-index"]') || el.closest('div[style]');
      return frame ? Number(getComputedStyle(frame).zIndex) || 0 : 0;
    }, name);
  };

  const mineTop = await zOf('Minesweeper');
  const notepadBack = await zOf('Notepad');
  expect(mineTop).toBeGreaterThan(notepadBack);

  expect(page.__errors).toEqual([]);
});

test('the pinned Internet row launches Internet Explorer', async ({ page }) => {
  await bootToDesktop(page);

  /*
   * The pinned Internet and Shop rows are hand-rendered, so they reach the
   * shell by a different route than the generated program rows the other
   * tests exercise. Both now carry an explicit 'open:<path>' action; this
   * keeps that true.
   */
  await startMenu(page, 'Internet');
  await expect(
    page.locator('.app__header__title', { hasText: 'Internet Explorer' }),
  ).toBeVisible();
});

test('All Programs is built from the filesystem, not the static fallback', async ({
  page,
}) => {
  await bootToDesktop(page);
  await startButton(page).click();
  await page.getByText('All Programs', { exact: true }).click();

  /*
   * "Shop Apps" is seeded into the Start Menu tree by vfsDefaults and
   * appears nowhere in Footer/FooterMenuData.js, so seeing it proves the
   * menu rendered the VFS. FooterMenu falls back to that static tree only
   * while the filesystem is still loading; this pins which side won, so
   * deleting the dead tree later is verifiable rather than hopeful.
   */
  await expect(page.getByText('Shop Apps', { exact: true })).toBeVisible();
  await expect(page.getByText('Accessories', { exact: true })).toBeVisible();
});
