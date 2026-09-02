import { test, expect, bootToDesktop, startButton } from './fixtures';

/*
 * The desktop itself: icons drag to a new cell and stay there across a
 * reload, and the tray's speaker drops the volume slider.
 */

const CELL = 75;

/** The whole icon (image and label) whose label reads `title`. */
const iconNamed = (page, title) =>
  page
    .locator('.desktop-icons-layer [class$="__text"]', {
      hasText: new RegExp(`^${title}$`),
    })
    .locator('xpath=../..');

const left = async icon => {
  const b = await icon.boundingBox();
  return Math.round(b.x);
};

test('a dragged icon snaps to a free cell and keeps it after a reload', async ({
  page,
}) => {
  await bootToDesktop(page);
  const icon = iconNamed(page, 'XP Shop');
  await expect(icon).toBeVisible();
  const before = await left(icon);

  const img = icon.locator('img').first();
  const b = await img.boundingBox();
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 80, y, { steps: 4 });
  await page.mouse.move(x + 2 * CELL, y, { steps: 4 });
  await page.mouse.up();

  // Align to Grid is on by default, so the drop lands two cells over
  await expect.poll(() => left(icon)).toBe(before + 2 * CELL);

  // The layout is written to the hive and the hive to IndexedDB, both debounced
  await page.waitForTimeout(1200);
  await page.reload();
  await page.locator('[data-user="guest"]').click();
  await startButton(page).waitFor({ state: 'visible' });
  const again = iconNamed(page, 'XP Shop');
  await expect(again).toBeVisible();
  expect(await left(again)).toBe(before + 2 * CELL);
  expect(page.__errors).toEqual([]);
});

test('the tray speaker drops the volume slider and a click elsewhere closes it', async ({
  page,
}) => {
  await bootToDesktop(page);
  const slider = page.locator('input[type="range"]');
  await expect(slider).toHaveCount(0);

  await page.locator('img[alt="Volume"]').click();
  await expect(slider).toBeVisible();

  await page.mouse.click(300, 200);
  await expect(slider).toHaveCount(0);
  expect(page.__errors).toEqual([]);
});
