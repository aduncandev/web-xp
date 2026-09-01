import { test, expect, bootToDesktop } from './fixtures';

/*
 * The Windows Error Recovery gate.
 *
 * When a schema change is about to wipe a store, the boot stops and offers
 * to back the files up first. That is the right call when someone has
 * work in there, and pure alarm when they do not — and the seeder plants
 * ordinary files (readme.txt, privacy.txt, two Favorites shortcuts) that
 * a naive check cannot tell apart from something a person made.
 *
 * Nothing else in the suite can reach this path, because the schema
 * version is a constant. These tests reach it by ageing the store's own
 * version marker, which is exactly what shipping a schema bump does.
 */

/** Rewrite the store's schema marker, so the next boot sees an old disk. */
async function ageTheStore(page) {
  await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('winxp_vfs');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('vfs_meta', 'readwrite');
          tx.objectStore('vfs_meta').put({
            path: '::schema',
            schemaVersion: '1',
          });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
  // localStorage carries a second copy of the version; age it too, or it
  // stands in for the marker we just moved.
  await page.evaluate(() => localStorage.setItem('winxp_vfs_schema', '1'));
}

const recoveryScreen = page =>
  page.getByText(/Windows did not start successfully/i);

test('a schema bump does not alarm someone who created nothing', async ({
  page,
}) => {
  await bootToDesktop(page);
  await ageTheStore(page);
  await page.reload();

  /*
   * The four seeded files must not be mistaken for the user's work. The
   * store should be reseeded quietly and land on the logon screen.
   */
  const tile = page.locator('[data-user="guest"]');
  await tile.waitFor({ state: 'visible' });
  await expect(recoveryScreen(page)).toHaveCount(0);
});

test('a schema bump offers recovery when the user has real files', async ({
  page,
}) => {
  await bootToDesktop(page);

  // Make something worth keeping.
  await page.mouse.click(600, 400, { button: 'right' });
  await page.getByText('New', { exact: true }).hover();
  await page.getByText('Text Document', { exact: true }).click();
  await page.keyboard.press('Enter');
  await expect(
    page.locator('.desktop-icons-layer').getByText(/New Text Document/),
  ).toHaveCount(1);
  await page.waitForTimeout(1200); // let the debounced write land

  await ageTheStore(page);
  await page.reload();

  await expect(recoveryScreen(page)).toBeVisible();
});
