import {
  test,
  expect,
  bootToDesktop,
  startMenu,
  startButton,
} from './fixtures';

/*
 * The shell's own machinery, beyond launching a window: the power dialog,
 * fast user switching, the taskbar's window arrangements, the item context
 * menu, and the Save As clash check. None of these has a program behind
 * it, so nothing in the smoke suite reaches them.
 */

const title = (page, text) =>
  page.locator('.app__header__title', { hasText: text });

/** The clock is taskbar chrome that opens the taskbar menu on right-click. */
const openTaskbarMenu = async page => {
  await page.locator('.footer__time').click({ button: 'right' });
};

test('Turn Off Computer offers Restart, which restarts', async ({ page }) => {
  await bootToDesktop(page);
  await startMenu(page, 'Turn Off Computer');

  await expect(page.getByText('Turn off computer')).toBeVisible();
  await page.getByText('Restart', { exact: true }).click();

  // The desktop goes and winlogon's status screens take over
  await expect(page.getByText('Saving your settings...')).toBeVisible();
  await expect(page.getByText('Windows is restarting...')).toBeVisible({
    timeout: 5000,
  });
  expect(page.__errors).toEqual([]);
});

test('Switch User keeps the session and its windows alive', async ({
  page,
}) => {
  await bootToDesktop(page);
  await startMenu(page, 'Notepad');
  await expect(title(page, 'Notepad')).toBeVisible();

  await startMenu(page, 'Log Off');
  await expect(page.getByText('Log Off Windows')).toBeVisible();
  await page.getByText('Switch User', { exact: true }).click();

  // Back at the user list, with the desktop mounted but hidden
  const tile = page.locator('[data-user="guest"]');
  await expect(tile).toBeVisible();
  await expect(title(page, 'Notepad')).toBeHidden();

  // Resuming brings the same session back, Notepad still open
  await tile.click();
  await expect(title(page, 'Notepad')).toBeVisible();
  expect(page.__errors).toEqual([]);
});

test('the taskbar menu shows the desktop and tiles windows', async ({
  page,
}) => {
  await bootToDesktop(page);
  await startMenu(page, 'Notepad');
  await startMenu(page, 'Notepad');
  const notepads = title(page, 'Notepad');
  await expect(notepads).toHaveCount(2);

  await openTaskbarMenu(page);
  await page.getByText('Show the Desktop', { exact: true }).click();
  await expect(notepads.first()).toBeHidden();
  await expect(notepads.last()).toBeHidden();

  // Both minimized: bring them back through their taskbar buttons
  const buttons = page.locator('.footer__window');
  await expect(buttons).toHaveCount(2);
  await buttons.first().click();
  await buttons.last().click();
  await expect(notepads.first()).toBeVisible();
  await expect(notepads.last()).toBeVisible();

  await openTaskbarMenu(page);
  await page.getByText('Tile Windows Vertically', { exact: true }).click();

  /*
   * Two windows tiled vertically stand side by side, each half the work
   * area wide: one at x = 0, the other at x = width / 2. Read the frames'
   * transforms, since that is where the shell puts a window.
   */
  const xs = await page.evaluate(() =>
    [...document.querySelectorAll('.app__header__title')]
      .map(el => el.closest('[style*="translate"]'))
      .filter(Boolean)
      .map(el => Number(el.style.transform.match(/translate\(([-\d.]+)px/)[1]))
      .sort((a, b) => a - b),
  );
  const width = await page.evaluate(() => window.innerWidth);
  expect(xs).toEqual([0, width / 2]);
  expect(page.__errors).toEqual([]);
});

test('an Explorer item offers the shared context menu', async ({ page }) => {
  await bootToDesktop(page);
  await startMenu(page, 'My Documents');
  await expect(title(page, 'My Documents')).toBeVisible();

  // readme.txt, with its known extension hidden by default
  const readme = page.locator('.com__item-name', { hasText: /^readme$/ });
  await expect(readme).toBeVisible();
  await readme.click({ button: 'right' });

  for (const verb of [
    'Open',
    'Open With',
    'Send To',
    'Cut',
    'Copy',
    'Delete',
  ]) {
    await expect(
      page.locator('.cm-label', { hasText: new RegExp(`^${verb}$`) }),
    ).toBeVisible();
  }
  // Notepad owns .txt, so it heads the Open With choices
  await page.locator('.cm-label', { hasText: /^Open With$/ }).hover();
  await expect(
    page.locator('.cm-label', { hasText: /^Notepad$/ }),
  ).toBeVisible();

  await page.keyboard.press('Escape');
  expect(page.__errors).toEqual([]);
});

test('Save As asks before replacing a file that differs only by case', async ({
  page,
}) => {
  await bootToDesktop(page);
  await startMenu(page, 'Notepad');
  await expect(title(page, 'Notepad')).toBeVisible();

  await page.locator('.app__content textarea').fill('a second readme');
  await page.locator('.drop-down__label', { hasText: 'File' }).click();
  await page.getByText('Save As...', { exact: true }).click();

  /*
   * The dialog opens on My Documents, which holds the seeded readme.txt.
   * Saving README.TXT there is saving over it, the clash check used to
   * compare exact strings, find nothing, and let the write replace the
   * file with no prompt.
   */
  const name = page.locator('.fd-name-input');
  await expect(name).toBeVisible();
  await name.fill('README.TXT');
  await name.press('Enter');

  await expect(page.getByText(/already exists/)).toBeVisible();
  await page.getByRole('button', { name: 'No' }).click();
  expect(page.__errors).toEqual([]);
});

test('the Start button is still where the tests expect it', async ({
  page,
}) => {
  await bootToDesktop(page);
  await expect(startButton(page)).toBeVisible();
});
