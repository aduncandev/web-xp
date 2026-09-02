import { test, expect, bootToDesktop } from './fixtures';

/*
 * The XP Shop: the splash gives way to the welcome page, the main menu's
 * catalogs lead to title pages, a free title downloads, installs and can
 * be deleted again, the category cards and the search keyboard filter the
 * lists, a paid title is refused politely, and the settings page keeps its
 * switches.
 */

const desktopIcon = (page, title) =>
  page
    .locator('.desktop-icons-layer [class$="__text"]', {
      hasText: new RegExp(`^${title}$`),
    })
    .locator('xpath=../..');

const back = page => page.locator('.underbtn--l', { hasText: /^Back$/ });

async function openShop(page) {
  await bootToDesktop(page);
  await desktopIcon(page, 'XP Shop').dblclick();
  // the splash holds for about two seconds before the welcome page
  await expect(page.getByText('Start Shopping')).toBeVisible({
    timeout: 15000,
  });
  await page.getByText('Start Shopping').click();
  await expect(page.getByText('Add XP Points')).toBeVisible();
}

test('a free title downloads, installs and can be deleted again', async ({
  page,
}) => {
  test.setTimeout(150000);
  await openShop(page);
  await page.locator('.panelbtn--0').click(); // Games
  await expect(page.getByText('Games to play on this computer')).toBeVisible();
  await page.getByText('Popular Titles').click();
  // the first title that is still free to download (one comes preinstalled)
  const row = page
    .locator('.row', {
      has: page.locator('.row__price', { hasText: /^Free$/ }),
    })
    .first();
  await expect(row).toBeVisible();
  const name = (await row.locator('.row__name').innerText()).trim();
  await row.click();
  await expect(page.locator('.b05__name')).toHaveText(name);
  await expect(page.locator('.buybtn__act')).toHaveText('Download');
  await page.locator('.buybtn').click();
  await expect(page.getByText('Download this software now?')).toBeVisible();
  await page.getByText('Yes', { exact: true }).click();
  await expect(page.getByText('You are downloading')).toBeVisible();
  // Mario collects his coins for a while before the fade
  await expect(page.getByText('Your download was successful!')).toBeVisible({
    timeout: 120000,
  });
  await page.getByText('OK', { exact: true }).click();
  await expect(page.locator('.buybtn__act')).toHaveText('Start');
  await expect(page.locator('.buybtn__price')).toHaveText('Downloaded');

  // it is listed among the downloaded titles, with its size
  for (let i = 0; i < 3; i++) await back(page).click();
  await page.getByText("Titles You've Downloaded").click();
  const mine = page.locator('.row', { hasText: name });
  await expect(mine).toHaveCount(1);
  await expect(mine.locator('.row__price')).toContainText(/[KM]B$/);

  await mine.click();
  await page.getByText('Delete Title').click();
  await expect(page.getByText('Delete this title?')).toBeVisible();
  await page.getByText('Delete', { exact: true }).click();
  await expect(page.getByText('The title has been deleted.')).toBeVisible();
  await page.getByText('OK', { exact: true }).click();
  await expect(page.locator('.buybtn__act')).toHaveText('Download');
  expect(page.__errors).toEqual([]);
});

test('category cards and the keyboard filter a shelf, and a paid title is refused', async ({
  page,
}) => {
  await openShop(page);
  await page.locator('.panelbtn--1').click(); // XPWare
  await page.getByText('Search by Category').click();
  await page.getByText('Genre', { exact: true }).click();
  const card = page.locator('.cardbtn', { hasText: 'Multimedia' });
  await expect(card).toContainText('Titles: 3');
  await card.click();
  await expect(page.locator('.pgtitle')).toHaveText('Multimedia');
  await expect(page.locator('.row')).toHaveCount(3);

  await page.locator('.row', { hasText: '100 XP Points' }).click();
  await expect(page.locator('.buybtn__price')).toHaveText('100 XP Points');
  await page.locator('.buybtn').click();
  await expect(page.locator('.dlc__ask')).toContainText(
    'You need 100 more XP Points for this title.',
  );
  // a fresh account has never seen an egg, so the shop does not mention them
  await expect(page.locator('.dlc__ask')).not.toContainText('Eggs');
  await expect(page.getByText('Yes', { exact: true })).toHaveCount(0);

  // back out to the shelf and search by title from the keyboard
  for (let i = 0; i < 5; i++) await back(page).click();
  await page.getByText('Search by Software Title').click();
  await expect(page.locator('.kb__key').first()).toBeVisible();
  await page.keyboard.type('winamp');
  await page.keyboard.press('Enter');
  await expect(page.locator('.pgtitle')).toHaveText('Results for winamp');
  await expect(page.locator('.row')).toHaveCount(1);
  expect(page.__errors).toEqual([]);
});

test('the shop keeps its sound switches and the egg economy unspoken', async ({
  page,
}) => {
  await openShop(page);
  await page.getByText('Add XP Points').click();
  await expect(
    page.getByText('XP Points cards are no longer sold.'),
  ).toBeVisible();
  await expect(page.getByText(/Trade/)).toHaveCount(0);
  await back(page).click();

  await page.getByText('Account Activity').click();
  await expect(page.locator('.acct__row')).toHaveCount(4);
  await back(page).click();

  await page.getByText('Settings and Features').click();
  await page.getByText('Music: On').click();
  await expect(page.getByText('Music: Off')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('storeWiiMusic'))).toBe(
    '0',
  );
  await back(page).click();

  await page.getByText('Welcome Screen').click();
  await expect(page.getByText('Start Shopping')).toBeVisible();
  await page.getByText('Welcome to the XP Shop!').click();
  await expect(page.getByText('Everything here is optional')).toBeVisible();
  expect(page.__errors).toEqual([]);
});
