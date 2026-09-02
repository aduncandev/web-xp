import { test, expect, bootToDesktop, startMenu } from './fixtures';

/*
 * Window chrome: dragging by the caption and resizing by the frame. The
 * frame is the padded box around the program; its edges are the grips.
 */

const frameOf = (page, title) =>
  page.locator('.app__header', { hasText: title }).locator('xpath=..');

const box = async locator => {
  const b = await locator.boundingBox();
  return {
    x: Math.round(b.x),
    y: Math.round(b.y),
    width: Math.round(b.width),
    height: Math.round(b.height),
  };
};

/** Press at (x, y), move by (dx, dy) in a few steps, release. */
async function gesture(page, x, y, dx, dy) {
  await page.mouse.move(x, y);
  await page.mouse.move(x + 1, y + 1);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx / 2, y + dy / 2);
  await page.mouse.move(x + dx, y + dy);
  await page.mouse.up();
}

test('a window drags by its caption and resizes by its frame', async ({
  page,
}) => {
  await bootToDesktop(page);
  await startMenu(page, 'Notepad');
  const frame = frameOf(page, 'Notepad');
  await expect(frame).toBeVisible();
  const before = await box(frame);

  // Drag by the caption, well away from the icon and the buttons
  await gesture(page, before.x + 120, before.y + 14, 90, 40);
  let after = await box(frame);
  expect(after.x - before.x).toBe(90);
  expect(after.y - before.y).toBe(40);
  expect(after.width).toBe(before.width);
  expect(after.height).toBe(before.height);

  // The bottom-right corner grows both dimensions and keeps the origin
  let start = after;
  await gesture(
    page,
    start.x + start.width - 1,
    start.y + start.height - 1,
    70,
    50,
  );
  after = await box(frame);
  expect(after.x).toBe(start.x);
  expect(after.y).toBe(start.y);
  expect(after.width - start.width).toBe(70);
  expect(after.height - start.height).toBe(50);

  // The left edge moves the origin so the right edge stays put
  start = after;
  await gesture(page, start.x + 1, start.y + start.height / 2, -60, 0);
  after = await box(frame);
  expect(after.x - start.x).toBe(-60);
  expect(after.width - start.width).toBe(60);
  expect(after.x + after.width).toBe(start.x + start.width);
  expect(after.height).toBe(start.height);

  // The top edge, likewise, keeps the bottom edge in place
  start = after;
  await gesture(page, start.x + start.width / 2, start.y + 1, 0, 30);
  after = await box(frame);
  expect(after.y - start.y).toBe(30);
  expect(after.height - start.height).toBe(-30);
  expect(after.y + after.height).toBe(start.y + start.height);

  // A window never shrinks below the frame's floor, however far the grip goes
  start = after;
  await gesture(page, start.x + start.width - 1, start.y + 20, -2000, 0);
  after = await box(frame);
  expect(after.x).toBe(start.x);
  expect(after.width).toBeGreaterThanOrEqual(200);
  expect(after.width).toBeLessThan(start.width);
  expect(page.__errors).toEqual([]);
});
