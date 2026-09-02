import { test, expect, bootToDesktop, startButton } from './fixtures';

/*
 * Display Properties, Appearance and Themes: Windows Classic style repaints
 * the frame, taskbar and controls from the scheme's system colours, a
 * scheme and a font size take effect, the choice survives a fresh logon,
 * and the Themes tab moves between Windows XP and Windows Classic.
 */

const openDisplayProperties = async page => {
  // the desktop's context menu is not armed for the first instant after
  // a logon; ask again if the first click drew nothing
  const item = page.getByText('Properties', { exact: true });
  for (let i = 0; i < 3 && (await item.count()) === 0; i++) {
    await page.mouse.click(600, 300, { button: 'right' });
    await item.waitFor({ timeout: 1500 }).catch(() => {});
  }
  await item.click();
  await expect(
    page.locator('.app__header__title', { hasText: 'Display Properties' }),
  ).toBeVisible();
};
const tab = (page, name) => page.locator('.dp__tab', { hasText: name }).click();
/** Open the drop-down list showing `current` and pick `option`. */
async function pick(page, current, option) {
  await page.locator('.xp-select', { hasText: current }).click();
  await page
    .locator('.xsl-item', { hasText: new RegExp(`^${option}$`) })
    .click();
}
const cssVar = (page, name) =>
  page.evaluate(
    n =>
      getComputedStyle(document.documentElement)
        .getPropertyValue(n)
        .trim(),
    name,
  );
const rootStyle = page =>
  page.evaluate(() => document.documentElement.dataset.xpStyle || '');
const frameColor = page =>
  page.evaluate(
    () =>
      getComputedStyle(document.querySelector('.xp-window')).backgroundColor,
  );
/** The bitmap the caption band is drawn from, if the style uses one. */
const captionImage = page =>
  page.evaluate(
    () =>
      getComputedStyle(document.querySelector('.xp-window .header__bg'))
        .borderImageSource,
  );

test('Windows Classic style repaints the shell and remembers its scheme', async ({
  page,
}) => {
  await bootToDesktop(page);
  await openDisplayProperties(page);
  await tab(page, 'Appearance');
  // Luna draws the caption from the style's own bitmap
  expect(await captionImage(page)).toContain('FrameCaption-1');

  await pick(page, 'Windows XP style', 'Windows Classic style');
  await page.getByRole('button', { name: 'Apply' }).click();
  expect(await rootStyle(page)).toBe('classic');
  // Windows Standard: 3D objects are the classic grey
  expect(await cssVar(page, '--xp-face')).toBe('rgb(212, 208, 200)');
  expect(await frameColor(page)).toBe('rgb(212, 208, 200)');

  await pick(page, 'Windows Standard', 'Brick');
  await pick(page, 'Normal', 'Large Fonts');
  await page.getByRole('button', { name: 'OK' }).click();
  expect(await cssVar(page, '--xp-caption-active')).toContain('rgb(128, 0, 0)');
  expect(await cssVar(page, '--xp-font-ui')).toBe('13px');

  // the hive keeps it across a logon
  await page.waitForTimeout(1200);
  await page.reload();
  await page.locator('[data-user="guest"]').click();
  await startButton(page).waitFor({ state: 'visible' });
  expect(await rootStyle(page)).toBe('classic');
  expect(await cssVar(page, '--xp-face')).toBe('rgb(194, 191, 165)');
  await openDisplayProperties(page);
  await tab(page, 'Appearance');
  await expect(page.locator('.xp-select', { hasText: 'Brick' })).toBeVisible();
  await expect(
    page.locator('.xp-select', { hasText: 'Large Fonts' }),
  ).toBeVisible();
  expect(page.__errors).toEqual([]);
});

test('the Themes tab switches between Windows XP and Windows Classic', async ({
  page,
}) => {
  await bootToDesktop(page);
  await openDisplayProperties(page);
  await tab(page, 'Themes');
  await expect(
    page.locator('.xp-select', { hasText: 'Windows XP' }),
  ).toBeVisible();
  await pick(page, 'Windows XP', 'Windows Classic');
  await page.getByRole('button', { name: 'OK' }).click();
  expect(await rootStyle(page)).toBe('classic');
  // the Classic theme has no wallpaper, just the desktop colour
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          getComputedStyle(
            document.querySelector('.desktop-icons-layer').parentElement,
          ).backgroundImage,
      ),
    )
    .toBe('none');

  await openDisplayProperties(page);
  await tab(page, 'Themes');
  await pick(page, 'Windows Classic', 'Windows XP');
  await page.getByRole('button', { name: 'OK' }).click();
  expect(await rootStyle(page)).toBe('luna');
  expect(page.__errors).toEqual([]);
});
