import { test, expect } from './fixtures';

/*
 * The filesystem core, driven directly. FileSystem has no React in it, so
 * these run against a fresh in-memory instance seeded with the default
 * tree, and check the rules that the UI tests can only reach one at a time.
 */

async function drive(page, body) {
  await page.goto('/');
  return page.evaluate(async src => {
    const [
      { FileSystem },
      { NodeStore },
      { Persistence },
      { buildDefaultFileSystem },
      { profileFoldersFor },
    ] = await Promise.all([
      import('/src/context/vfs/fileSystem.js'),
      import('/src/context/vfs/nodeStore.js'),
      import('/src/context/vfs/persistence.js'),
      import('/src/context/vfsDefaults.js'),
      import('/src/context/vfsConstants.js'),
    ]);
    const store = new NodeStore();
    let changes = 0;
    const fs = new FileSystem({
      store,
      persistence: new Persistence(store, () => {}),
      notify: () => {
        changes += 1;
      },
    });
    for (const n of buildDefaultFileSystem(['Guest'])) store.set(n);
    const F = profileFoldersFor('Guest');
    // eslint-disable-next-line no-new-func
    const run = new Function('fs', 'F', 'profileFoldersFor', src);
    const out = run(fs, F, profileFoldersFor);
    return { ...out, changes };
  }, body);
}

const name = p => p.split('/').pop();

test('names: case-only renames, clashes, copies and the bin', async ({
  page,
}) => {
  const r = await drive(
    page,
    `
    const docs = F.MY_DOCUMENTS;
    const out = {};
    out.caseRename = fs.rename(docs + '/readme.txt', 'README.txt').ok;
    out.caseRenamed = fs.getNode(docs + '/readme.txt').name;
    fs.rename(docs + '/README.txt', 'readme.txt');
    fs.createFile(docs + '/notes.txt', 'hi');
    out.clash = fs.rename(docs + '/notes.txt', 'README.TXT').error;
    out.copies = [fs.copy(docs + '/notes.txt', docs).newPath, fs.copy(docs + '/notes.txt', docs).newPath];
    for (const p of ['dup.txt', 'dup.txt', 'DUP.TXT']) {
      fs.createFile(docs + '/dup.txt', 'x');
      fs.deleteNode(docs + '/' + p);
    }
    out.bin = fs.getRecycleBinContents().map(n => n.name).filter(n => /^dup/i.test(n)).sort();
    const first = fs.getRecycleBinContents().find(n => n.name === 'dup.txt');
    out.restore = fs.restoreFromRecycleBin(first.path).ok;
    out.restored = !!fs.getNode(docs + '/dup.txt');
    const second = fs.getRecycleBinContents().find(n => n.name === 'dup (1).txt');
    out.restoreClash = fs.restoreFromRecycleBin(second.path).error;
    return out;
  `,
  );
  expect(r.caseRename).toBe(true);
  expect(r.caseRenamed).toBe('README.txt');
  expect(r.clash).toBe('exists');
  expect(r.copies.map(name)).toEqual([
    'Copy of notes.txt',
    'Copy (2) of notes.txt',
  ]);
  // The bin numbers repeats the way XP does, not by stacking suffixes
  expect(r.bin).toEqual(['dup (1).txt', 'dup (2).txt', 'dup.txt']);
  expect(r.restore).toBe(true);
  expect(r.restored).toBe(true);
  expect(r.restoreClash).toBe('exists');
  expect(r.changes).toBeGreaterThan(0);
});

test('moves: cycles and same-folder drops are refused regardless of case', async ({
  page,
}) => {
  const r = await drive(
    page,
    `
    const docs = F.MY_DOCUMENTS;
    fs.createFolder(docs + '/A');
    fs.createFolder(docs + '/A/B');
    fs.createFile(docs + '/notes.txt', 'hi');
    return {
      cycle: fs.move(docs + '/A', docs + '/a/b').error,
      same: fs.move(docs + '/notes.txt', docs.toUpperCase()).error,
      moved: fs.move(docs + '/notes.txt', docs + '/a/B').newPath,
      listed: fs.listDir(docs + '/A/B').map(n => n.name),
      size: fs.getDirSize(docs + '/a'),
    };
  `,
  );
  expect(r.cycle).toBe('cycle');
  expect(r.same).toBe('same');
  expect(r.moved).toBe(
    `${'C:/Documents and Settings/Guest/My Documents'}/A/B/notes.txt`,
  );
  expect(r.listed).toEqual(['notes.txt']);
  expect(r.size).toBe(2);
});

test('shortcuts hide known extensions and protected folders stay put', async ({
  page,
}) => {
  const r = await drive(
    page,
    `
    const docs = F.MY_DOCUMENTS;
    fs.createFile(docs + '/notes.txt', 'hi');
    return {
      first: fs.createShortcutTo(docs + '/notes.txt', F.DESKTOP).path,
      second: fs.createShortcutTo(docs + '/notes.txt', F.DESKTOP).path,
      target: fs.getNode(F.DESKTOP + '/Shortcut to notes').target,
      deskDeleted: fs.deleteNode(F.DESKTOP),
      deskProtected: fs.isProtectedPath(F.DESKTOP),
      readOnlyDeleted: fs.deleteNode(docs + '/privacy.txt'),
    };
  `,
  );
  expect(name(r.first)).toBe('Shortcut to notes');
  expect(name(r.second)).toBe('Shortcut to notes (2)');
  expect(name(r.target)).toBe('notes.txt');
  expect(r.deskDeleted).toBe(false);
  expect(r.deskProtected).toBe(true);
  expect(r.readOnlyDeleted).toBe(false);
});

test('accounts: the hive, no resurrection on logon, and renames that follow the profile', async ({
  page,
}) => {
  const r = await drive(
    page,
    `
    const docs = F.MY_DOCUMENTS;
    const out = {};
    fs.setUserConfigFor('Guest', 'runHistory', ['calc']);
    out.hive = fs.getUserConfigFor('Guest', 'runHistory', null);
    out.hiveHidden = fs.getNode(F.ROOT + '/ntuser.dat').hidden;
    fs.deleteNode(docs + '/readme.txt');
    fs.createUserProfile('Guest');
    out.resurrected = !!fs.getNode(docs + '/readme.txt');
    fs.setUserConfigFor('Guest', 'desktopLayout', {
      positions: { [F.DESKTOP + '/XP Shop']: { col: 1, row: 2 } },
      autoArrange: false,
      alignToGrid: true,
    });
    out.renamed = fs.renameUserProfile('Guest', 'Visitor');
    const V = profileFoldersFor('Visitor');
    out.layoutKeys = Object.keys(fs.getUserConfigFor('Visitor', 'desktopLayout', {}).positions);
    out.oldRootGone = !fs.getNode(F.ROOT);
    out.newDesktop = !!fs.getNode(V.DESKTOP);
    return out;
  `,
  );
  expect(r.hive).toEqual(['calc']);
  expect(r.hiveHidden).toBe(true);
  // Deleting a seeded file to the bin must not bring it back on logon
  expect(r.resurrected).toBe(false);
  expect(r.renamed).toBe(true);
  expect(r.layoutKeys).toEqual([
    'C:/Documents and Settings/Visitor/Desktop/XP Shop',
  ]);
  expect(r.oldRootGone).toBe(true);
  expect(r.newDesktop).toBe(true);
});
