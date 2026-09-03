import { test, expect, bootToDesktop, startMenu } from './fixtures';

/*
 * Display scaling. Windows at 125% or 150% reports a device pixel ratio of
 * 1.25 or 1.5, where a macOS retina display reports 2. On the fractional
 * ratios the browser rounds each nine-slice rectangle on its own and leaves
 * hairlines between them, which read as seams across the chrome's
 * gradients. The desktop keeps its size at every ratio; on a fractional one
 * the slice compositor (theme/sliceCompositor.js) draws each part as a
 * single texture instead, which cannot seam.
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

    test('the desktop keeps its size and fills the window', async ({
      page,
    }) => {
      await bootToDesktop(page);
      const g = await geometry(page);
      expect(g.dpr).toBeCloseTo(dpr, 3);
      // one stage pixel is one css pixel, whatever the display scaling is
      expect(g.scale).toBeCloseTo(1, 3);
      // bitmaps interpolate only where pixels cannot be drawn one for one
      const fractional = await page.evaluate(
        () => document.documentElement.dataset.xpFractional,
      );
      expect(fractional).toBe(Number.isInteger(dpr) ? '' : '1');
      expect(g.width * g.scale).toBeCloseTo(g.inner[0], 0);
      expect(g.height * g.scale).toBeCloseTo(g.inner[1], 0);
      expect(page.__errors).toEqual([]);
    });

    test('nine-slice parts become single textures on a fractional ratio', async ({
      page,
    }) => {
      await bootToDesktop(page);
      // a task button only exists once something is running
      await startMenu(page, 'My Documents');
      await expect(page.locator('.footer__window')).toBeVisible();
      await page.waitForTimeout(300);
      const drawn = await page.evaluate(() => {
        const of = sel => {
          const cs = getComputedStyle(document.querySelector(sel));
          return { slice: cs.borderImageSource, image: cs.backgroundImage };
        };
        return {
          start: of('.footer__start'),
          task: of('.footer__window'),
          caption: of('.xp-window .header__bg'),
        };
      });
      for (const [name, d] of Object.entries(drawn)) {
        if (Number.isInteger(dpr)) {
          // whole ratios draw the style's nine slices directly
          expect(d.slice, name).toContain('url(');
        } else {
          // fractional ones get one composed texture per element
          expect(d.slice, name).toBe('none');
          expect(d.image, name).toContain('data:image');
        }
      }
      expect(page.__errors).toEqual([]);
    });

    test('a chosen resolution is centred and still fits', async ({ page }) => {
      await page.addInitScript(() =>
        localStorage.setItem(
          'xpDisplay',
          JSON.stringify({ mode: [1024, 768], depth: 32, dpi: 96 }),
        ),
      );
      await bootToDesktop(page);
      const g = await geometry(page);
      expect([g.width, g.height]).toEqual([1024, 768]);
      expect(g.width * g.scale).toBeLessThanOrEqual(g.inner[0] + 1);
      expect(g.height * g.scale).toBeLessThanOrEqual(g.inner[1] + 1);
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
      // dragged 60 by 50 screen pixels, whatever the display scaling is
      expect(Math.round(after.x - before.x)).toBe(60);
      expect(Math.round(after.y - before.y)).toBe(50);
      expect(page.__errors).toEqual([]);
    });
  });
}
