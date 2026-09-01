import { test, expect } from './fixtures';

/*
 * The cheap, no-UI half of the suite: does the seeded filesystem agree
 * with the program registry?
 *
 * This is the direct regression test for the thing that makes this
 * codebase awkward — one program's existence spread across several
 * hand-synchronised places. It imports the real source modules from the
 * dev server, so it reads exactly what ships, with no mocks and no
 * duplicated fixture data.
 */

async function survey(page) {
  await page.goto('/');
  return page.evaluate(async () => {
    const [apps, defaults] = await Promise.all([
      import('/src/WinXP/apps/index.jsx'),
      import('/src/context/vfsDefaults.js'),
    ]);

    const nodes = defaults.buildDefaultFileSystem(['Guest']);
    const byPath = new Map(nodes.map(n => [n.path, n]));
    const norm = p => String(p).replace(/\\/g, '/').toLowerCase();
    const paths = new Set([...byPath.keys()].map(norm));
    const programs = new Set(Object.keys(apps.PROGRAMS).map(norm));

    const shortcuts = nodes.filter(n => n.type === 'shortcut' && n.target);
    // A shortcut may target a special-folder token ("RecycleBin") instead
    // of a path; only absolute paths are ours to resolve.
    const isPath = t => /^[A-Za-z]:\//.test(String(t));

    return {
      nodeCount: nodes.length,
      programCount: programs.size,
      shortcutCount: shortcuts.length,
      // Shortcuts pointing at a path the seeder never created.
      brokenShortcuts: shortcuts
        .filter(s => isPath(s.target) && !paths.has(norm(s.target)))
        .map(s => `${s.path} -> ${s.target}`),
      // Seeded .exe files with no entry in the registry: they appear in
      // the Start menu and Explorer but cannot launch.
      unlaunchableExes: [...byPath.values()]
        .filter(n => n.type === 'file' && norm(n.path).endsWith('.exe'))
        .filter(n => !programs.has(norm(n.path)))
        .map(n => n.path),
    };
  });
}

test('no seeded shortcut points at a file that does not exist', async ({ page }) => {
  const r = await survey(page);
  expect(r.nodeCount).toBeGreaterThan(100);
  expect(r.shortcutCount).toBeGreaterThan(10);
  expect(r.brokenShortcuts, 'shortcuts with a missing target').toEqual([]);
});

test('seeded programs that cannot launch do not increase', async ({ page }) => {
  const r = await survey(page);

  /*
   * Every .exe on the seeded disk that has no registry entry. These are
   * the Start menu's phantom entries — Address Book, Movie Maker and
   * friends — which render because the filesystem has them and do nothing
   * because no program backs them.
   *
   * This is a ratchet, not a target: the number may only go down. Lower
   * the baseline whenever you remove one, and the test stops you quietly
   * adding another.
   */
  const BASELINE = 33;
  expect(
    r.unlaunchableExes.length,
    `unlaunchable seeded exes:\n  ${r.unlaunchableExes.join('\n  ')}`,
  ).toBeLessThanOrEqual(BASELINE);
});
