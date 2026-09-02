import { test, expect, bootToDesktop, startMenu } from './fixtures';

/*
 * Paint, end to end: drawing with the pencil, undo and redo, an outlined
 * rectangle and a flood fill, the palette, Attributes, and Save As. The
 * canvas is read back pixel by pixel. Written before the component was
 * split, so the split has something to answer to.
 */

const title = (page, text) =>
  page.locator('.app__header__title', { hasText: text });

const openPaint = async page => {
  await bootToDesktop(page);
  await startMenu(page, 'Paint');
  await expect(title(page, 'untitled - Paint')).toBeVisible();
  await page.locator('.paint__canvas').waitFor();
};

/** The RGB under a canvas pixel. */
const pixel = (page, x, y) =>
  page.evaluate(
    ([x, y]) => {
      const d = document
        .querySelector('.paint__canvas')
        .getContext('2d')
        .getImageData(x, y, 1, 1).data;
      return [d[0], d[1], d[2]];
    },
    [x, y],
  );

/** Drag on the canvas from (x0, y0) to (x1, y1), in canvas pixels. */
async function drag(page, x0, y0, x1, y1) {
  const box = await page.locator('.paint__canvas').boundingBox();
  await page.mouse.move(box.x + x0, box.y + y0);
  await page.mouse.down();
  await page.mouse.move(box.x + (x0 + x1) / 2, box.y + (y0 + y1) / 2);
  await page.mouse.move(box.x + x1, box.y + y1);
  await page.mouse.up();
}

const BLACK = [0, 0, 0];
const WHITE = [255, 255, 255];

test('the pencil draws, and undo and redo take it back and forth', async ({
  page,
}) => {
  await openPaint(page);
  expect(await pixel(page, 50, 50)).toEqual(WHITE);
  await drag(page, 20, 50, 80, 50);
  expect(await pixel(page, 50, 50)).toEqual(BLACK);

  await page.keyboard.press('Control+z');
  expect(await pixel(page, 50, 50)).toEqual(WHITE);
  await page.keyboard.press('F4');
  expect(await pixel(page, 50, 50)).toEqual(BLACK);
  expect(page.__errors).toEqual([]);
});

test('a rectangle is outlined, and the fill tool fills it', async ({
  page,
}) => {
  await openPaint(page);
  await page.locator('.paint__tool[title="Rectangle"]').click();
  await drag(page, 20, 20, 120, 100);
  expect(await pixel(page, 20, 60)).toEqual(BLACK);
  expect(await pixel(page, 70, 60)).toEqual(WHITE);

  await page.locator('.paint__tool[title="Fill With Color"]').click();
  // the third swatch is red on the stock palette
  await page
    .locator('.paint__swatch')
    .nth(3)
    .click();
  const box = await page.locator('.paint__canvas').boundingBox();
  await page.mouse.click(box.x + 70, box.y + 60);
  const inside = await pixel(page, 70, 60);
  expect(inside).not.toEqual(WHITE);
  expect(await pixel(page, 200, 300)).toEqual(WHITE);
  expect(page.__errors).toEqual([]);
});

test('Attributes resizes the page and Save As names the window', async ({
  page,
}) => {
  await openPaint(page);
  await page.keyboard.press('Control+e');
  await expect(page.getByText('Attributes')).toBeVisible();
  const fields = page.locator('input[type="text"], input:not([type])');
  await fields.nth(0).fill('100');
  await fields.nth(1).fill('50');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page.locator('.paint__canvas')).toHaveCSS('width', '100px');
  await expect(page.locator('.paint__canvas')).toHaveCSS('height', '50px');

  await page.locator('.drop-down__label', { hasText: /^File$/ }).click();
  await page.getByText('Save As...', { exact: true }).click();
  const name = page.locator('.fd-name-input');
  await name.fill('scribble.bmp');
  await name.press('Enter');
  await expect(title(page, 'scribble - Paint')).toBeVisible();
  expect(page.__errors).toEqual([]);
});
