import { test, expect, bootToDesktop, startMenu } from './fixtures';

/*
 * Regressions for the behavioural bugs the audit turned up: window
 * stacking after Tile, junk Control Panel paths, what a backup carries,
 * and the two ways a program name can reach the shell.
 */

const title = (page, text) =>
  page.locator('.app__header__title', { hasText: text });

test('Tile keeps the focused window on top', async ({ page }) => {
  await page.goto('/');
  const order = await page.evaluate(async () => {
    const [{ reducer, initState }, A] = await Promise.all([
      import('/src/WinXP/reducer.js'),
      import('/src/WinXP/constants/actions.js'),
    ]);
    const launch = (state, exePath) =>
      reducer(state, {
        type: A.ADD_APP,
        payload: { exePath, header: {}, resizable: true },
      });
    let s = launch(launch(launch(initState, 'a.exe'), 'b.exe'), 'c.exe');
    const middle = s.apps[1].id;
    s = reducer(s, { type: A.FOCUS_APP, payload: middle });
    s = reducer(s, {
      type: A.TILE_WINDOWS_VERTICALLY,
      payload: { width: 1200, height: 800 },
    });
    const top = [...s.apps].sort((x, y) => y.zIndex - x.zIndex)[0];
    return {
      topIsMiddle: top.id === middle,
      x: s.apps.map(a => a.offset.x),
    };
  });
  expect(order.topIsMiddle).toBe(true);
  // three windows side by side
  expect(new Set(order.x).size).toBe(3);
});

test('Control Panel only navigates to pages it has', async ({ page }) => {
  await page.goto('/');
  const r = await page.evaluate(async () => {
    const { resolveLocation } = await import('/src/WinXP/shell/location.js');
    const vfs = { getNode: () => null, exists: () => false };
    return {
      junk: resolveLocation(vfs, 'Control Panel/nonsense').exists,
      category: resolveLocation(vfs, 'Control Panel/cat:performance'),
      home: resolveLocation(vfs, 'Control Panel').view,
    };
  });
  expect(r.junk).toBe(false);
  expect(r.category.exists).toBe(true);
  expect(r.category.pageTitle).toBe('Performance and Maintenance');
  expect(r.home).toBe('home');
});

test('a backup carries shortcuts and skips the bin, seeded program folders and read-only files', async ({
  page,
}) => {
  await page.goto('/');
  const r = await page.evaluate(async () => {
    const [
      { FileSystem },
      { NodeStore },
      { Persistence },
      { buildDefaultFileSystem },
      { profileFoldersFor },
      { buildBackupZip, restoreBackupZip },
      { readZip },
    ] = await Promise.all([
      import('/src/context/vfs/fileSystem.js'),
      import('/src/context/vfs/nodeStore.js'),
      import('/src/context/vfs/persistence.js'),
      import('/src/context/vfsDefaults.js'),
      import('/src/context/vfsConstants.js'),
      import('/src/context/vfsBackup.js'),
      import('/src/context/zip.js'),
    ]);
    const make = () => {
      const store = new NodeStore();
      const fs = new FileSystem({
        store,
        persistence: new Persistence(store, () => {}),
        notify: () => {},
      });
      for (const n of buildDefaultFileSystem(['Guest'])) store.set(n);
      return fs;
    };
    const F = profileFoldersFor('Guest');
    const fs = make();
    fs.createFile(`${F.MY_DOCUMENTS}/notes.txt`, 'hello');
    fs.createFolder(`${F.MY_DOCUMENTS}/Empty`);
    fs.createShortcutTo(`${F.MY_DOCUMENTS}/notes.txt`, F.DESKTOP);
    fs.createFile(`${F.MY_DOCUMENTS}/gone.txt`, 'bye');
    fs.deleteNode(`${F.MY_DOCUMENTS}/gone.txt`);
    const { blob } = await buildBackupZip([...fs.store.values()], async node =>
      new TextEncoder().encode(fs.readFile(node.path) || ''),
    );
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const names = readZip(bytes).entries.map(e => e.name);

    // Restore into a fresh machine
    const fresh = make();
    // a doctored archive cannot overwrite a read-only seeded file
    const privacyBefore = fresh.readFile(`${F.MY_DOCUMENTS}/privacy.txt`);
    const { restored, skipped } = await restoreBackupZip(fresh.api, bytes);
    return {
      names,
      restored,
      skipped,
      shortcut: fresh.getNode(`${F.DESKTOP}/Shortcut to notes`)?.target,
      notes: fresh.readFile(`${F.MY_DOCUMENTS}/notes.txt`),
      empty: fresh.getNode(`${F.MY_DOCUMENTS}/Empty`)?.type,
      privacySame:
        fresh.readFile(`${F.MY_DOCUMENTS}/privacy.txt`) === privacyBefore,
    };
  });
  const has = re => r.names.some(n => re.test(n));
  expect(has(/Guest\/My Documents\/notes\.txt$/)).toBe(true);
  expect(has(/Guest\/Desktop\/Shortcut to notes\.lnk$/)).toBe(true);
  expect(has(/Guest\/My Documents\/Empty\/$/)).toBe(true);
  expect(has(/RECYCLER/)).toBe(false);
  expect(has(/Program Files\/Winamp\/$/)).toBe(false);
  expect(r.shortcut).toMatch(/notes\.txt$/);
  expect(r.notes).toBe('hello');
  expect(r.empty).toBe('folder');
  expect(r.privacySame).toBe(true);
  expect(r.restored).toBeGreaterThan(0);
});

test('a registered alias launches from the prompt and a mirrored exe from Explorer', async ({
  page,
}) => {
  await bootToDesktop(page);

  // cmd falls back to the registry's command names
  await startMenu(page, 'Run...');
  const run = page.locator('input').first();
  await run.fill('cmd');
  await run.press('Enter');
  await expect(title(page, 'cmd.exe')).toBeVisible();
  await page.keyboard.type('paint');
  await page.keyboard.press('Enter');
  await expect(title(page, 'Paint')).toBeVisible();

  // C:\WINDOWS\notepad.exe is the same program as the system32 copy
  await startMenu(page, 'My Documents');
  const address = page.locator('.com__address_bar__input');
  await address.fill('C:\\WINDOWS');
  await address.press('Enter');
  // the shell hides its own folder's contents until asked
  await page
    .getByText('Show the contents of this folder')
    .first()
    .click();
  await page.locator('.com__item-name', { hasText: /^notepad$/ }).dblclick();
  await expect(title(page, 'Notepad')).toBeVisible();
  expect(page.__errors).toEqual([]);
});

test('a shell folder keeps its identity by tag, and only registered paths are special', async ({
  page,
}) => {
  await page.goto('/');
  const r = await page.evaluate(async () => {
    const { shellFolderFor, isProtectedShellFolder } = await import(
      '/src/context/vfsConstants.js'
    );
    const kind = n => (shellFolderFor(n) || {}).kind || null;
    return {
      renamedByTag: kind({
        path: 'C:/Documents and Settings/Guest/My Documents/Tunes',
        specialFolder: 'my-music',
      }),
      untaggedByPath: kind({
        path: 'C:/Documents and Settings/Guest/My Documents/My Pictures',
      }),
      sharedByPath: kind({
        path: 'C:/Documents and Settings/All Users/Documents',
      }),
      elsewhere: kind({ path: 'C:/Stuff/My Music' }),
      startMenuProtected: isProtectedShellFolder({
        path: 'C:/Documents and Settings/Guest/Start Menu',
      }),
      sharedProtected: isProtectedShellFolder({
        path: 'C:/Documents and Settings/All Users/Documents',
      }),
    };
  });
  expect(r.renamedByTag).toBe('my-music');
  expect(r.untaggedByPath).toBe('my-pictures');
  expect(r.sharedByPath).toBe('shared-documents');
  expect(r.elsewhere).toBeNull();
  expect(r.startMenuProtected).toBe(true);
  expect(r.sharedProtected).toBe(false);
});
