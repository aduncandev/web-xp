// Real-XP art drop-in registry.
//
// Every hand-drawn placeholder in the app resolves through getArt(name,
// fallback). Drop a genuine XP asset into src/assets/xp/ named `<name>.png`
// (gif/jpg/ico/bmp also work) and it replaces the placeholder automatically
// on the next build — no code changes.
//
// Expected names are documented in src/assets/xp/README.md.
const files = import.meta.glob('./assets/xp/*.{png,gif,jpg,jpeg,ico,bmp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

// Real XP .cur cursor files live in cursors/ and register as `cursors/<name>`.
const cursorFiles = import.meta.glob('./assets/xp/cursors/*.cur', {
  eager: true,
  query: '?url',
  import: 'default',
});

const byName = {};
for (const [path, url] of Object.entries(files)) {
  const base = path
    .split('/')
    .pop()
    .replace(/\.(png|gif|jpe?g|ico|bmp)$/i, '');
  byName[base.toLowerCase()] = url;
}
for (const [path, url] of Object.entries(cursorFiles)) {
  const base = path
    .split('/')
    .pop()
    .replace(/\.cur$/i, '');
  byName['cursors/' + base.toLowerCase()] = url;
}

/** Real asset URL for `name` if one has been dropped in, else the fallback. */
export function getArt(name, fallback) {
  return byName[String(name).toLowerCase()] || fallback;
}

/** True when a real asset exists for `name`. */
export function hasArt(name) {
  return String(name).toLowerCase() in byName;
}
