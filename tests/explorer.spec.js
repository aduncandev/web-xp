import { test, expect, bootToDesktop, startMenu } from './fixtures';

/*
 * Explorer's own chrome: the address bar, the history buttons, the Views
 * menu, the Folders pane, and the rename box. These pin the behaviour of
 * the window before its component is split up.
 */

const title = (page, text) =>
  page.locator('.app__header__title', { hasText: text });

const openMyDocuments = async page => {
  await bootToDesktop(page);
  await startMenu(page, 'My Documents');
  await expect(title(page, 'My Documents')).toBeVisible();
};

test('the address bar, Up and Back move through the tree', async ({ page }) => {
  await openMyDocuments(page);

  const address = page.locator('.com__address_bar__input');
  await address.fill('C:\\WINDOWS');
  await address.press('Enter');
  await expect(title(page, 'WINDOWS')).toBeVisible();
  await expect(address).toHaveValue('C:\\WINDOWS');

  await page.locator('img[alt="Up"]').click();
  await expect(title(page, 'Local Disk (C:)')).toBeVisible();

  await page.locator('img[alt="Back"]').click();
  await expect(title(page, 'WINDOWS')).toBeVisible();

  await page.locator('img[alt="Forward"]').click();
  await expect(title(page, 'Local Disk (C:)')).toBeVisible();

  // A path that does not exist is refused, not navigated to
  await address.fill('C:\\Nowhere');
  await address.press('Enter');
  await expect(
    page.getByText(/Windows cannot find 'C:\\Nowhere'/),
  ).toBeVisible();
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(title(page, 'Local Disk (C:)')).toBeVisible();
  expect(page.__errors).toEqual([]);
});

test('the Views button switches to Details and the headers sort', async ({
  page,
}) => {
  await openMyDocuments(page);

  await page.locator('img[alt="Views"]').click();
  await page.locator('.cm-label', { hasText: /^Details$/ }).click();

  const headers = page.locator('.com__table th');
  await expect(headers).toHaveText([/Name/, /Size/, /Type/, /Date Modified/]);

  // Folders lead regardless of the sort, tied on size and so ordered by
  // name; a second click flips the whole order, tiebreak included
  const names = page.locator('.com__td--name .com__item-name');
  await headers.nth(1).click();
  await expect(headers.nth(1).locator('.com__sort')).toHaveCount(1);
  await expect(names.first()).toHaveText('My Music');
  await headers.nth(1).click();
  await expect(headers.nth(1).locator('.com__sort--desc')).toHaveCount(1);
  await expect(names.first()).toHaveText('My Videos');
  expect(page.__errors).toEqual([]);
});

test('New Folder opens the rename box, and F2 renames again', async ({
  page,
}) => {
  await openMyDocuments(page);

  await page
    .locator('.com__options')
    .getByText('File', { exact: true })
    .click();
  await page.getByText('New', { exact: true }).hover();
  await page.getByText('Folder', { exact: true }).click();

  const box = page.locator('.com__rename-input');
  await expect(box).toBeVisible();
  await expect(box).toHaveValue('New Folder');
  await box.fill('Holiday');
  await box.press('Enter');
  const holiday = page.locator('.com__item-name', { hasText: /^Holiday$/ });
  await expect(holiday).toBeVisible();

  await holiday.click();
  await page.keyboard.press('F2');
  await expect(box).toBeVisible();
  await box.fill('Trip');
  await box.press('Enter');
  await expect(
    page.locator('.com__item-name', { hasText: /^Trip$/ }),
  ).toBeVisible();
  await expect(holiday).toHaveCount(0);
  expect(page.__errors).toEqual([]);
});

test('the Folders pane replaces the task pane with the tree', async ({
  page,
}) => {
  await openMyDocuments(page);
  await expect(page.getByText('File and Folder Tasks')).toBeVisible();

  await page
    .locator('.com__function_bar__text', { hasText: 'Folders' })
    .click();
  await expect(page.getByText('File and Folder Tasks')).toBeHidden();
  const tree = page.locator('.com__content');
  const node = label => tree.getByText(label, { exact: true }).first();
  await expect(node('Desktop')).toBeVisible();
  await expect(node('Recycle Bin')).toBeVisible();

  // Clicking a tree node navigates the window
  await node('Desktop').click();
  await expect(title(page, 'Desktop')).toBeVisible();
  expect(page.__errors).toEqual([]);
});
