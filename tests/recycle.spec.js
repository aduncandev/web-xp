import { test, expect, bootToDesktop } from './fixtures';

/*
 * Delete and restore, through the UI.
 *
 * This guards the VFS's descendant handling: deleting a folder moves it
 * and everything under it into C:/RECYCLER while remembering where each
 * piece came from, and restoring puts the whole subtree back — recreating
 * ancestors if they are gone. That machinery is the most intricate part of
 * the filesystem and the least obvious when it breaks.
 */

const desktopIcon = (page, name) =>
  page.locator('.desktop-icons-layer').getByText(name, { exact: true });

test('a deleted desktop item goes to the Recycle Bin and comes back', async ({
  page,
}) => {
  await bootToDesktop(page);

  const shop = desktopIcon(page, 'XP Shop');
  await expect(shop).toBeVisible();

  await shop.click({ button: 'right' });
  await page.getByText('Delete', { exact: true }).click();

  // Recycle Bin Properties asks before it takes anything, like XP does.
  const confirmYes = page.getByRole('button', { name: 'Yes' });
  if (await confirmYes.isVisible().catch(() => false)) {
    await confirmYes.click();
  }
  await expect(shop).toHaveCount(0);

  // The bin now holds it, with its original location remembered.
  await desktopIcon(page, 'Recycle Bin').dblclick();
  const binWindow = page.locator('.app__header__title', {
    hasText: 'Recycle Bin',
  });
  await expect(binWindow).toBeVisible();

  const binned = page.getByText('XP Shop', { exact: true }).last();
  await expect(binned).toBeVisible();

  await binned.click({ button: 'right' });
  await page.getByText('Restore', { exact: true }).click();

  // Back where it came from.
  await expect(desktopIcon(page, 'XP Shop')).toBeVisible();
});
