import { test as base, expect } from '@playwright/test';

/*
 * Shared setup for every test.
 *
 * Each Playwright test gets a fresh browser context, so localStorage and
 * IndexedDB both start empty — every test boots a genuinely new machine.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    /*
     * Pin Math.random before any app code runs.
     *
     * shellOpen ambushes roughly one launch in fifteen with the egg
     * (src/WinXP/shell/open.js:44-54) until the first egg is ever
     * collected — which is exactly the state a fresh test machine is in.
     * Left alone it would fail one launch assertion in fifteen, at random,
     * on a different test each run. 0.5 clears the 1/15 threshold and
     * nothing in this suite wants varied randomness.
     */
    await page.addInitScript(() => {
      Math.random = () => 0.5;
    });

    // The desktop turns any uncaught error into a BSOD, so a crash is
    // loud rather than silent. Collect them so a failing test can say
    // what actually went wrong instead of just timing out on a selector.
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.__errors = errors;

    await use(page);
  },
});

/** The taskbar's Start button — present only once the shell has mounted. */
export const startButton = page => page.locator('img[alt="start"]');

/**
 * Boot a fresh machine straight to a usable desktop.
 *
 * `?guest` creates the Guest account and turns fast boot on, which skips
 * both the POST splash and Setup, so tests do not pay for ceremony they
 * are not testing. The fresh-install path is covered separately.
 */
export async function bootToDesktop(page) {
  await page.goto('/?guest');

  const tile = page.locator('[data-user="guest"]');
  await tile.waitFor({ state: 'visible' });
  await tile.click();

  await expect(page).toHaveTitle("Guest's Computer");
  await page.locator('.desktop-icons-layer').waitFor({ state: 'visible' });
  await startButton(page).waitFor({ state: 'visible' });
}

/** Open the Start menu and click one of its entries by visible text. */
export async function startMenu(page, label) {
  await startButton(page).click();
  await page.getByText(label, { exact: true }).first().click();
}

export { expect };
