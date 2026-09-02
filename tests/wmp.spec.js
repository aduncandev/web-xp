import { test, expect, bootToDesktop, startMenu } from './fixtures';

/*
 * Windows Media Player, end to end: the first-time library search over the
 * seeded shared music, playing a track, the visualization buttons, the
 * feature taskbar, and a playlist made from the File menu. Written before
 * the component was split, so the split has something to answer to.
 */

const title = (page, text) =>
  page.locator('.app__header__title', { hasText: text });

const openPlayer = async page => {
  await bootToDesktop(page);
  await startMenu(page, 'Windows Media Player');
  await expect(title(page, 'Windows Media Player')).toBeVisible();
};

const taskButton = (page, caption) => page.getByText(caption, { exact: true });

const searchLibrary = async page => {
  // The Media Library asks before it goes looking, like the real one
  await page.locator('.wmp__vizname').waitFor();
  // the caption sits under the skin's hit button, so aim at it and let
  // whatever is on top take the click
  await taskButton(page, 'Media Library').click({ force: true });
  await expect(
    page.getByText(/first time you have been to the Media Library/),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Yes' }).click();
  await expect(page.getByText(/5 file\(s\) were added/)).toBeVisible();
  await page.getByRole('button', { name: 'OK' }).click();
};

test('Media Player finds the shared music and plays a track', async ({
  page,
}) => {
  await openPlayer(page);
  await expect(page.locator('.wmp__meta')).toHaveText('No media loaded');
  await searchLibrary(page);

  // Now Playing lists the whole library as All Audio
  await taskButton(page, 'Now Playing').click({ force: true });
  await expect(page.locator('.wmp__combo-label')).toHaveText('All Audio');
  const rows = page.locator('.wmp__pl-title');
  await expect(rows).toHaveCount(5);
  await expect(page.getByText(/^Total Time:/)).toBeVisible();

  // A double-click plays that row; the marquee names it
  await rows.last().dblclick();
  await expect(page.locator('.wmp__meta')).toHaveText(/^Song: /);
  await expect
    .poll(() => page.evaluate(() => !document.querySelector('video').paused), {
      timeout: 20000,
    })
    .toBe(true);
  expect(page.__errors).toEqual([]);
});

test('the visualization buttons cycle presets and the taskbar folds away', async ({
  page,
}) => {
  await openPlayer(page);
  const viz = page.locator('.wmp__vizname');
  await expect(viz).toHaveText('Ambience: Water');
  // next, then previous, lands back where it started
  const buttons = page
    .locator('.wmp__vizname')
    .locator('xpath=..')
    .locator('button');
  await buttons.nth(2).click();
  await expect(viz).not.toHaveText('Ambience: Water');
  await buttons.nth(1).click();
  await expect(viz).toHaveText('Ambience: Water');

  await page.locator('[title="Hide taskbar"]').click();
  await expect(page.locator('[title="Show taskbar"]')).toBeVisible();
  await expect(page.getByText('Media Library', { exact: true })).toBeHidden();
  await page.locator('[title="Show taskbar"]').click();
  await expect(page.getByText('Media Library', { exact: true })).toBeVisible();
  expect(page.__errors).toEqual([]);
});

test('File > New Playlist creates a list the player switches to', async ({
  page,
}) => {
  await openPlayer(page);
  await searchLibrary(page);
  await page.locator('.drop-down__label', { hasText: /^File$/ }).click();
  await page.getByText('New Playlist...', { exact: true }).click();
  // the prompt's box carries the suggested name; type over it
  const input = page.locator('.msg-input');
  await expect(input).toBeVisible();
  await input.fill('Mine');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page.locator('.wmp__combo-label')).toHaveText('Mine');
  await expect(page.getByText('Mine', { exact: true }).first()).toBeVisible();
  expect(page.__errors).toEqual([]);
});
