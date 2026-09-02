import {
  test,
  expect,
  bootToDesktop,
  startMenu,
  startButton,
} from './fixtures';

/*
 * The speakers: the tray slider sounds the level it is left at, the mixer
 * has a column for every open program that makes sound, a program's level
 * is remembered after it closes and after a fresh logon, the mixer window
 * grows and shrinks with its columns, and a channel's level really scales
 * what plays on it.
 */

/** Record every media play with the volume it started at. */
const recordPlays = page =>
  page.addInitScript(() => {
    window.__plays = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function() {
      window.__plays.push({
        src: this.currentSrc || this.src,
        volume: this.volume,
        muted: this.muted,
      });
      return play.call(this);
    };
  });
const dings = page =>
  page.evaluate(() =>
    window.__plays.filter(p => /Ding/i.test(decodeURIComponent(p.src))),
  );

const trayIcon = page => page.locator('img[alt="Volume"]');
const column = (page, name) => page.locator('.vc__channel', { hasText: name });
const columnSlider = (page, name) => column(page, name).locator('.vc__vslider');

/** Click a vertical slider `fromTop` pixels below its top edge. */
async function clickSlider(page, slider, fromTop) {
  const box = await slider.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + fromTop);
}

test('the tray slider sounds the level it is left at', async ({ page }) => {
  await recordPlays(page);
  await bootToDesktop(page);
  await trayIcon(page).click();
  const slider = page.locator('input[type="range"]');
  await expect(slider).toBeVisible();
  expect(await dings(page)).toEqual([]);

  // the slider stands on end, so near its top is loud
  await clickSlider(page, slider, 8);
  await expect.poll(async () => (await dings(page)).length).toBe(1);
  const level = Number(await slider.inputValue());
  expect(level).toBeGreaterThan(70);
  expect((await dings(page))[0].volume).toBeCloseTo(level / 100, 1);

  // clicking the thumb where it sits sounds it again
  await clickSlider(page, slider, 8);
  await expect.poll(async () => (await dings(page)).length).toBe(2);
  expect(page.__errors).toEqual([]);
});

test('the mixer lists open programs that make sound and remembers their levels', async ({
  page,
}) => {
  await bootToDesktop(page);
  await startMenu(page, 'Windows Media Player');
  const wmpTitle = page.locator('.app__header__title', {
    hasText: 'Windows Media Player',
  });
  await expect(wmpTitle).toBeVisible();

  await trayIcon(page).dblclick();
  const titles = page.locator('.vc__title');
  await expect(titles).toHaveText([
    'Volume Control',
    'System Sounds',
    'Windows Media Player',
  ]);
  const mixerWindow = page
    .locator('.app__header__title', { hasText: /^Volume Control$/ })
    .locator('xpath=../..');
  const wide = (await mixerWindow.boundingBox()).width;

  await columnSlider(page, 'Windows Media Player').fill('30');
  await wmpTitle
    .locator('xpath=..')
    .locator('.header__button--close')
    .click();
  await expect(titles).toHaveText(['Volume Control', 'System Sounds']);
  expect((await mixerWindow.boundingBox()).width).toBeLessThan(wide);

  await startMenu(page, 'Windows Media Player');
  await expect(columnSlider(page, 'Windows Media Player')).toHaveValue('30');

  // and after a fresh logon
  await page.waitForTimeout(1200);
  await page.reload();
  await page.locator('[data-user="guest"]').click();
  await startButton(page).waitFor({ state: 'visible' });
  await startMenu(page, 'Windows Media Player');
  await trayIcon(page).dblclick();
  await expect(columnSlider(page, 'Windows Media Player')).toHaveValue('30');
  expect(page.__errors).toEqual([]);
});

test("a channel's level scales what plays on it", async ({ page }) => {
  await recordPlays(page);
  await bootToDesktop(page);
  await trayIcon(page).dblclick();
  await columnSlider(page, 'System Sounds').fill('50');

  // letting go of the master thumb sounds the ding through System Sounds
  const master = columnSlider(page, 'Volume Control');
  const box = await master.boundingBox();
  await clickSlider(page, master, box.height / 2);
  await expect.poll(async () => (await dings(page)).length).toBe(1);
  const level = Number(await master.inputValue());
  expect((await dings(page))[0].volume).toBeCloseTo((level / 100) * 0.5, 2);
  expect(page.__errors).toEqual([]);
});
