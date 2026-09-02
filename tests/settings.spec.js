import { test, expect, bootToDesktop, startButton } from './fixtures';

/*
 * Per-user settings that moved into the profile hive: the wallpaper and
 * the sound levels. Both have to survive a reload.
 */

const title = (page, text) =>
  page.locator('.app__header__title', { hasText: text });

const desktopBackgroundImage = page =>
  page.evaluate(
    () =>
      getComputedStyle(
        document.querySelector('.desktop-icons-layer').parentElement,
      ).backgroundImage,
  );

const relogon = async page => {
  await page.reload();
  await page.locator('[data-user="guest"]').click();
  await startButton(page).waitFor({ state: 'visible' });
};

test('a wallpaper chosen in Display Properties survives a reload', async ({
  page,
}) => {
  await bootToDesktop(page);
  expect(await desktopBackgroundImage(page)).toContain('url(');

  await page.mouse.click(600, 300, { button: 'right' });
  await page.locator('.cm-label', { hasText: /^Properties$/ }).click();
  await expect(title(page, 'Display Properties')).toBeVisible();
  await page.locator('.dp__item', { hasText: /^\(None\)$/ }).click();
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(title(page, 'Display Properties')).toHaveCount(0);
  await expect.poll(() => desktopBackgroundImage(page)).toBe('none');

  await page.waitForTimeout(1200);
  await relogon(page);
  expect(await desktopBackgroundImage(page)).toBe('none');
  expect(page.__errors).toEqual([]);
});

test('the volume level survives a reload', async ({ page }) => {
  await bootToDesktop(page);
  await page.locator('img[alt="Volume"]').click();
  const slider = page.locator('input[type="range"]');
  await slider.fill('20');
  await expect(slider).toHaveValue('20');

  await page.waitForTimeout(1200);
  await relogon(page);
  await page.locator('img[alt="Volume"]').click();
  await expect(page.locator('input[type="range"]')).toHaveValue('20');
  expect(page.__errors).toEqual([]);
});
