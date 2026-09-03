import { test, expect, bootToDesktop, startMenu } from './fixtures';

/*
 * Display scaling. Windows at 125% or 150% reports a device pixel ratio of
 * 1.25 or 1.5, where a macOS retina display reports 2. On the fractional
 * ratios the browser lands element edges and bitmap slices on half device
 * pixels, and the chrome shows seams around buttons and window frames, so
 * the stage snaps its scale: one stage pixel always covers a whole number
 * of device pixels.
 */

const geometry = page =>
  page.evaluate(() => {
    const el = document.getElementById('xp-stage');
    const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
    return {
      dpr: window.devicePixelRatio,
      scale: m.a,
      width: el.offsetWidth,
      height: el.offsetHeight,
      inner: [window.innerWidth, window.innerHeight],
    };
  });

for (const dpr of [1, 1.25, 1.5, 2]) {
  test.describe(`at a device pixel ratio of ${dpr}`, () => {
    test.use({ deviceScaleFactor: dpr });

    test('a stage pixel covers whole device pixels, and covers the window', async ({
      page,
    }) => {
      await bootToDesktop(page);
      const g = await geometry(page);
      expect(g.dpr).toBeCloseTo(dpr, 3);
      const devicePixels = g.scale * g.dpr;
      expect(devicePixels).toBeCloseTo(Math.round(devicePixels), 3);
      expect(devicePixels).toBeGreaterThanOrEqual(1);
      // the desktop fills the browser window, with no sliver of black
      expect(g.width * g.scale).toBeCloseTo(g.inner[0], 0);
      expect(g.height * g.scale).toBeCloseTo(g.inner[1], 0);
      expect(page.__errors).toEqual([]);
    });

    test('a chosen resolution is letterboxed on whole device pixels', async ({
      page,
    }) => {
      await page.addInitScript(() =>
        localStorage.setItem(
          'xpDisplay',
          JSON.stringify({ mode: [1024, 768], depth: 32, dpi: 96 }),
        ),
      );
      await bootToDesktop(page);
      const g = await geometry(page);
      expect([g.width, g.height]).toEqual([1024, 768]);
      const devicePixels = g.scale * g.dpr;
      expect(devicePixels).toBeCloseTo(Math.round(devicePixels), 3);
      expect(page.__errors).toEqual([]);
    });

    test('the pointer lands where it is put', async ({ page }) => {
      await bootToDesktop(page);
      await startMenu(page, 'My Documents');
      const win = page.locator('.xp-window').last();
      await expect(win).toBeVisible();
      const before = await win.boundingBox();
      await page.mouse.move(before.x + 200, before.y + 12);
      await page.mouse.down();
      await page.mouse.move(before.x + 260, before.y + 62, { steps: 8 });
      await page.mouse.up();
      const after = await win.boundingBox();
      // dragged 60 by 50 screen pixels, whatever the stage scale is
      expect(Math.round(after.x - before.x)).toBe(60);
      expect(Math.round(after.y - before.y)).toBe(50);
      expect(page.__errors).toEqual([]);
    });
  });
}
