import { test, expect, bootToDesktop, startMenu } from './fixtures';

/*
 * Display Properties, Settings: a screen resolution lays the desktop out on
 * a stage of that size, scaled down to fit the browser window and centred
 * with black around it; Monitor Settings asks whether to keep it; dragging
 * still follows the pointer at that scale; the setting survives a logon (it
 * is the machine's); colour quality paints the 16-bit look; the DPI setting
 * draws bigger.
 */

const openDisplayProperties = async page => {
  const item = page.getByText('Properties', { exact: true });
  for (let i = 0; i < 3 && (await item.count()) === 0; i++) {
    await page.mouse.click(600, 300, { button: 'right' });
    await item.waitFor({ timeout: 1500 }).catch(() => {});
  }
  await item.click();
  await expect(
    page.locator('.app__header__title', { hasText: 'Display Properties' }),
  ).toBeVisible();
  await page.locator('.dp__tab', { hasText: 'Settings' }).click();
};
/** Where the stage sits on screen. */
const stageBox = page =>
  page.evaluate(() => {
    const r = document.getElementById('xp-stage').getBoundingClientRect();
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      width: Math.round(r.width),
      height: Math.round(r.height),
    };
  });
/** The stage's own size, in the pixels the shell lays out in. */
const stageLogical = page =>
  page.evaluate(() => {
    const s = document.getElementById('xp-stage').style;
    return { width: parseInt(s.width, 10), height: parseInt(s.height, 10) };
  });
/** Slide to the stop labelled `width by height`. */
async function slideTo(page, width, height) {
  const slider = page.locator('.dp__slider');
  const stops = Number(await slider.getAttribute('max')) + 1;
  for (let i = 0; i < stops; i++) {
    await slider.fill(String(i));
    const label = await page.locator('.dp__res').innerText();
    if (label.startsWith(`${width} by ${height}`)) return;
  }
  throw new Error(`no ${width} by ${height} stop`);
}
const relogon = async page => {
  await page.reload();
  await page.locator('[data-user="guest"]').click();
  await page.locator('.desktop-icons-layer').waitFor();
};

test('a resolution bigger than the window is scaled down to fit, and windows still drag under the pointer', async ({
  page,
}) => {
  await bootToDesktop(page);
  await openDisplayProperties(page);
  expect(await stageBox(page)).toEqual({
    x: 0,
    y: 0,
    width: 1280,
    height: 800,
  });
  await expect(page.locator('.dp__res')).toHaveText('1280 by 800 pixels');

  await slideTo(page, 1600, 1200);
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(
    page.getByText('Your desktop has been reconfigured'),
  ).toBeVisible();
  // 1600x1200 in 1280x800: scaled by 2/3, black bars left and right
  let box = await stageBox(page);
  expect(Math.abs(box.width - 1067)).toBeLessThanOrEqual(1);
  expect(Math.abs(box.x - 107)).toBeLessThanOrEqual(1);
  expect(box.height).toBe(800);
  expect(await stageLogical(page)).toEqual({ width: 1600, height: 1200 });
  await page.getByRole('button', { name: 'Yes' }).click();
  await page.getByRole('button', { name: 'OK' }).click();

  // the taskbar is 30 stage pixels, 20 on screen
  const bar = await page.evaluate(() =>
    Math.round(
      document.querySelector('.xp-taskbar').getBoundingClientRect().height,
    ),
  );
  expect(bar).toBe(20);

  // a window dragged 100 screen pixels moves 100 screen pixels
  await startMenu(page, 'Notepad');
  const title = page.locator('.app__header__title', { hasText: 'Notepad' });
  await expect(title).toBeVisible();
  const before = await title.boundingBox();
  const y = before.y + before.height / 2;
  await page.mouse.move(before.x + 40, y);
  await page.mouse.down();
  await page.mouse.move(before.x + 90, y, { steps: 5 });
  await page.mouse.move(before.x + 140, y, { steps: 5 });
  await page.mouse.up();
  const after = await title.boundingBox();
  expect(Math.abs(after.x - before.x - 100)).toBeLessThanOrEqual(1);

  // a context menu opens under the pointer
  await page.mouse.click(640, 200, { button: 'right' });
  const menu = page.locator('.xp-menu').first();
  await expect(menu).toBeVisible();
  const mb = await menu.boundingBox();
  expect(Math.abs(mb.x - 640)).toBeLessThan(3);
  expect(Math.abs(mb.y - 200)).toBeLessThan(3);
  await page.keyboard.press('Escape');

  // the machine remembers it across a logon
  await relogon(page);
  await expect
    .poll(async () => (await stageBox(page)).width)
    .toBeGreaterThan(1060);
  expect(page.__errors).toEqual([]);
});

test('a resolution smaller than the window stands in the middle with black around it, and No puts it back', async ({
  page,
}) => {
  await bootToDesktop(page);
  await openDisplayProperties(page);
  await slideTo(page, 800, 600);
  await page.getByRole('button', { name: 'Apply' }).click();
  expect(await stageBox(page)).toEqual({
    x: 240,
    y: 100,
    width: 800,
    height: 600,
  });
  expect(
    await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
  ).toBe('rgb(0, 0, 0)');
  await page.getByRole('button', { name: 'No' }).click();
  expect(await stageBox(page)).toEqual({
    x: 0,
    y: 0,
    width: 1280,
    height: 800,
  });
  await expect(page.locator('.dp__res')).toHaveText('1280 by 800 pixels');
  expect(page.__errors).toEqual([]);
});

test('colour quality and the DPI setting take effect', async ({ page }) => {
  await bootToDesktop(page);
  await openDisplayProperties(page);
  await page.locator('.xp-select', { hasText: 'Highest (32 bit)' }).click();
  await page.locator('.xsl-item', { hasText: 'Medium (16 bit)' }).click();
  await page.getByRole('button', { name: 'Advanced' }).click();
  await expect(page.getByText('DPI setting:')).toBeVisible();
  await page.locator('.xp-select', { hasText: 'Normal size (96 DPI)' }).click();
  await page.locator('.xsl-item', { hasText: 'Large size (120 DPI)' }).click();
  await page
    .locator('.xpdlg', { hasText: 'DPI setting' })
    .getByRole('button', { name: 'OK' })
    .click();
  await page.getByRole('button', { name: 'Apply' }).click();
  await page.getByRole('button', { name: 'Yes' }).click();
  // Large DPI: the same window, laid out at 1024x640 and drawn 1.25x
  expect(await stageLogical(page)).toEqual({ width: 1024, height: 640 });
  expect(await stageBox(page)).toEqual({
    x: 0,
    y: 0,
    width: 1280,
    height: 800,
  });
  expect(
    await page.evaluate(() => document.getElementById('xp-stage').style.filter),
  ).toContain('xp-16bit');
  expect(await page.locator('#xp-16bit').count()).toBe(1);
  expect(page.__errors).toEqual([]);
});
