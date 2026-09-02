# Maintaining webXP

The [README](README.md) says what the site does. This file says how it is
built and how to change it without breaking the parts you did not touch. It
was written after the 2026 refactor, so it describes the tree as it is now.

## Principles

**Recreate, do not approximate.** Every surface is measured against real
Windows XP: screenshots, extracted resources, the behaviour of the real
shell. Real ripped art goes in `src/assets/xp/` and replaces the placeholder
by name (see [that folder's README](src/assets/xp/README.md)). When XP did
something odd, the odd thing is the spec.

**One source of truth per fact.** A program's path is `EXE_PATHS`, its
window is `PROGRAMS`, its icons are `PROGRAM_META` and `ICON_REGISTRY`, its
file types are `FILE_ASSOCIATIONS`, the shell's own folders are
`SHELL_FOLDERS`. When two places must agree, one of them reads the other. If
you find a literal that repeats a table, replace it with the table.

**The filesystem is the model.** Programs are `.exe` files on the disk,
shortcuts carry targets, the Start menu is a folder of shortcuts, and every
per-user setting is JSON inside the user's `ntuser.dat`. If a feature can be
expressed as files and settings, it should be.

**Pin behaviour before you cut.** The only test tier is Playwright against
the real dev server. Write the test that shows the current behaviour, then
refactor under it.

**Comments say why.** Terse, hyphens and commas rather than em-dashes, no
banner comments narrating what the next ten lines do. A comment earns its
place by recording a reason the code cannot show.

## Map of the tree

| Path | What lives there |
| --- | --- |
| `src/App.jsx` | The machine: boot screens, logon, fast user switching, the BSOD handler. `SCREEN` names its states. |
| `src/context/vfs/` | The filesystem core, React-free: `nodeStore` (the node table), `persistence` (IndexedDB writes), `boot` (schema, migrations, recovery), `fileSystem` (every operation), `userConfig` (the hive). |
| `src/context/VFSContext.jsx` | The provider over the core: boots it, bumps `version` on change, owns the clipboard and recent documents. |
| `src/context/vfsConstants.js` | `EXE_PATHS`, `SPECIAL_FOLDERS`, `profileFoldersFor`, `FILE_ASSOCIATIONS`, `SHELL_FOLDERS`, icon helpers. |
| `src/context/vfsDefaults.js` | The seeded disk: machine tree, one profile per account, the Start menu tree as data. |
| `src/context/vfsIcons.js` | `ICON_REGISTRY`, keyed by `iconKey`; `finishIcons` stamps a node. |
| `src/context/vfsBackup.js` | The backup archive both the Backup tool and the recovery screen build and restore. |
| `src/context/users.js` | The account registry in localStorage: names, avatars, passwords, the active user, fast boot. |
| `src/context/VolumeContext.jsx` | Master volume and the mixer, per account in the hive. |
| `src/context/DialogContext.jsx` | `useDialog()`: `alert`, `confirm`, `confirm3`, `prompt`, all XP message boxes. |
| `src/WinXP/index.jsx` | The shell host for one session: the window reducer, focus, the desktop surface, and the hooks below. |
| `src/WinXP/reducer.js` | Window state: each app carries `offset`, `size`, `zIndex`, `minimized`, `maximized`, `header`. |
| `src/WinXP/shellBus.js` | The bus between the shell and task-management UIs: the published window list, close/focus/arrange requests, close interceptors. |
| `src/WinXP/use*.js` | The host's side jobs: wallpaper, screen saver, Start menu data, host drops, Open With, the power flow. |
| `src/WinXP/Windows/` | The window frame, `HeaderButtons`, `ProgramErrorBoundary`. |
| `src/hooks/useElementResize.js` | Drag and resize for a frame, a controlled view of the store's geometry. |
| `src/WinXP/Icons/` | The desktop: `useDesktopIcons`, `useDesktopLayout`, `useIconDrag`, `menus`. |
| `src/WinXP/Footer/` | The taskbar: `Clock`, `TrayVolume`, `QuickLaunch`, `FooterWindow`, `FooterMenu` (the Start menu), `menus`. |
| `src/WinXP/startMenuConfig.js` | Pins, launch counts, Quick Launch and the Taskbar and Start Menu Properties, in the hive under `startMenu`. |
| `src/WinXP/shell/` | Shell policy: `open.js` (what opening a path does), `location.js` (namespaces), `fileTypes.js`, `itemActions.js` (the shared context-menu verbs), `move.js`, `zipVerbs.js`, `useExplorerView.js` (Folder Options). |
| `src/WinXP/shell/Explorer/` | Windows Explorer, split into hooks (`useHistory`, `useArchiveListing`, `useRubberBand`, `useItemDragDrop`) and parts (`AddressBar`, `FunctionBar`, `LeftPane`, `views`, `MyComputerView`, `FolderTree`, `contextMenus`, `menus`). |
| `src/WinXP/shell/ControlPanel/` | Control Panel: `categories.js` is the data (categories, classic applets, valid views). |
| `src/WinXP/apps/` | One folder per program. `index.jsx` is the registry, `layout.js` the launch geometry, `compat.jsx` the device gates, `programMeta.js` shared icons. |
| `src/WinXP/apps/Store/catalog.js` | Everything the XP Shop sells and how it installs. |
| `src/WinXP/system/` | The applets that open as windows: Display Properties, System Properties, Task Manager, Volume Control. |
| `src/components/` | Dialogs and shared widgets: `XPDialogFrame`, `FileDialog`, `ContextMenu`, `PropertiesDialog`, `ListView`, `LogonUI`, `Setup`, the screen savers. |
| `src/xpArt.js` | `getArt(name, fallback)`: the drop-in registry over `src/assets/xp/`. |
| `src/WinXP/sounds.js` | `playSystemSound(key)` and the sound scheme. |
| `public/` | Static content served as-is: music, wallpapers, the embedded games. |
| `server/guestbook/` | The one server, with its own README. |
| `tests/` | The Playwright suite. `fixtures.js` boots a machine. |

Import aliases (`vite.config.js`): `assets/`, `components/`, `context/`,
`hooks/`, `WinXP/`. All five are in use.

## How the pieces fit

### Boot and sessions

`App.jsx` walks `SCREEN.CD_BOOT` (first visit) or `SCREEN.BOOT`, then Setup
or the logon surface, then `SCREEN.DESKTOP`. Every logged-on account keeps a
mounted `<WinXP>`; only the one whose `active` prop is true is shown, drives
the shell bus, plays audio and writes its desktop layout. `?guest` creates a
Guest account and turns fast boot on.

While Windows Error Recovery is up (`vfs.recovery`) the boot holds and the
logon surface does not mount. An account's profile tree is created when the
disk is ready, not only at the moment of logon.

Inside a session, read the account from the `userName` prop, not
`getCurrentUserName()`: a switched-out session is still mounted and must
keep describing its own user. `SPECIAL_FOLDERS.DESKTOP` and friends are
getters that resolve for the account on screen; use `profileFoldersFor(name)`
when you mean a specific account.

### Windows

`reducer.js` owns the window list. `ADD_APP` turns a registry entry plus the
launch layout into an app record; `SET_APP_GEOMETRY` is how a drag or resize
lands; Cascade and Tile write `offset` and `size` directly and restack.

`Windows/index.jsx` renders each app as `<Program {...props} />` inside
`ProgramErrorBoundary`, so a program that throws closes its own content
rather than blue-screening the desktop. The frame hands every program:

| Prop | Meaning |
| --- | --- |
| `onClose`, `onMinimize` | close or minimize this window |
| `onShellOpen(path, opts)` | open anything through the shell |
| `onSetHeader({ title, icon })` | change the caption |
| `registerCloseInterceptor(fn)` | ask before closing ("Save changes?"); `fn` resolves truthy to allow |
| `isFocus` | whether this window is on top |
| `...injectProps` | whatever the launch passed: `filePath` for documents, `initialPath` for Explorer, `initialUrl` for IE |

`useElementResize` is controlled: the store's `offset` and `size` come in,
the hook shows the pointer's geometry while a gesture runs, and commits on
release. Windows pulled off-screen by a shrinking viewport are brought back.

### Opening things

`shell/open.js` is the one launch path. Desktop icons, Start menu rows, the
Run box, cmd's `start` and file associations all call `shellOpen(path)`:
URLs go to IE, shell tokens (`My Computer`, `RecycleBin`) and folders browse
in Explorer, shortcuts chase their targets, `.exe` files resolve through the
registry (`getProgramByPath`, which also knows the seeded mirror copies),
documents open in their association or the user's override, and the rest
ends in the Open With picker.

`shell/location.js` answers "what is at this path" for Explorer: My
Computer, the Recycle Bin, Control Panel pages (validated against
`isControlPanelView`), archives, folders, drives.

### The filesystem

```
NodeStore  -> the node table, case-insensitive, parent -> children index
Persistence -> dirty tracking, debounced IndexedDB writes, blobs
boot       -> open the database, load or wipe-and-reseed, run migrations
FileSystem -> every operation the shell calls; `fs.api` is what the context spreads
UserConfig -> the hive: JSON in each profile's ntuser.dat
VFSContext -> boots the above, re-renders consumers on `version`
```

A node has `path`, `type` (`drive`, `folder`, `file`, `shortcut`,
`special`), `name`, `system`, `hidden`, `readOnly`, `iconKey`, `icon`,
`iconLarge`, and for files `content` (text) or `blobId` (binary) or
`sourceUrl` (a bundled asset). Icon URLs are hashed per build, so nodes
persist `iconKey` and `boot.js` re-resolves the URLs on load.

`system: true` means four things at once, and they are meant to travel
together: the shell refuses to delete or move it, its attributes are
locked, backups leave it out, and the additive pass on boot re-adds it if a
store lost it. The site's own programs are system files; Store titles are
not, so they can be uninstalled.

The `version` counter bumps on every change, including hive writes. Memos
that read the filesystem key on `vfs.version`.

### Settings

Per-user settings live in the hive. Read with
`vfs.getUserConfigFor(userName, key, fallback)`, write with
`vfs.setUserConfigFor(userName, key, value)`. Keys in use:

`desktopLayout`, `explorerView`, `fileAssocOverrides`, `startMenu`,
`taskbarLocked`, `wallpaper`, `screenSaver`, `sound`, `recentDocuments`,
`runHistory`, `solitaireOptions`, `wmpOptions`, `mediaTagEdits`,
`mediaLibrary`, `eggData`, `lastEggTime`, `xpPoints`, `deltascend`.

Machine-level state that must exist before the disk is up stays in
localStorage: the account registry, the active user, fast boot, and the
machine's sound levels (the startup chime plays before anyone logs on).

### Explorer and the desktop

Explorer's `index.jsx` composes hooks and parts; the listing is `items`
(sorted by `sortItems`), selection is a list of paths, and the context menus
are built by `contextMenus.js` and `Icons/menus.js`. The desktop and
Explorer share `buildIconMenuItems` for the item menu and
`shell/itemActions.js` for the verbs that behave the same everywhere; each
keeps only its own arms (navigation, desktop layout).

The Luna task pane is one style block, `taskPaneCss`, and one pair of
components, `TaskCard` and `taskRow`, used by both Explorer and Control
Panel.

### Taskbar and Start menu

`Footer/index.jsx` composes the pieces. The Start menu (`FooterMenu`) builds
All Programs from the account's real Start Menu folder
(`useStartMenuData`), pins and the most-used list from `startMenuConfig`.
Hover and open state are keyed by `data-menu-id`, never by label text.

### Task management

The shell publishes `{ id, title, icon, exePath, minimized, maximized,
hidden, focused }` per window to `shellBus`; Task Manager and cmd read it,
and request close, focus, minimize and arrange through the bus. A window's
`hidden` means the taskbar does not show it either.

## Recipes

### Add a program

1. Add its path to `EXE_PATHS` in `vfsConstants.js`. Every other place refers to the constant.
2. Add a `PROGRAMS` entry in `apps/index.jsx`: `displayName`, `description`, `commandNames`, `header`, `component`, `defaultSize`, and the flags the docblock lists. A device-gated program wraps its component in `compat.jsx` and gives a `layout()`.
3. Seed the executable in `vfsDefaults.js` with `makeExe` (system by default). A system exe appears on existing disks through the additive pass; no schema bump.
4. Give it an `iconKey` in `ICON_REGISTRY` (`vfsIcons.js`) and, if the Start menu or Quick Launch shows it at 16 or 32 pixels, an entry in `PROGRAM_META`.
5. Put it in the Start menu: an entry in `allProgramsTree` (`vfsDefaults.js`). Existing profiles do not gain the shortcut; only new profiles and fresh seeds do, unless you bump the schema.
6. Run `npx playwright test tests/invariants.spec.js`. The registry, the seeder and the Store are cross-checked there, and the ratchet on unlaunchable exes will refuse a seeded exe with no program behind it.

Task Manager needs nothing: it names the process from the exe path the
shell publishes with each window.

A program the XP Shop sells is different: it is a `CATALOG` entry in
`apps/Store/catalog.js` with `exePath`, `folder`, `shortcutName`,
`shortcutIconKey`, `shelf`, price, and `installApp` creates the exe and
shortcuts (system: false, so it uninstalls). Music and other content are
`kind: 'media'` entries that seed server-hosted files into the buyer's
profile.

### Open a document type

1. `FILE_ASSOCIATIONS` in `vfsConstants.js`: the program that opens it, its icons, and a `typeName` when the label is not "<EXT> File".
2. `EXT_TYPE_LABELS` and `openWithChoicesFor` in `shell/fileTypes.js` if Open With should offer alternatives.
3. `guessMimeType` in `vfsUtils.js`.
4. `PROGIDS` in `apps/CommandPrompt/commands.js` if `assoc` should name it the way XP did.
5. The program receives the file as `filePath` in its props.

### Add a per-user setting

Pick a hive key, read it with `getUserConfigFor(userName, key, fallback)`,
write it with `setUserConfigFor`. Consumers re-render through
`vfs.version`; for a value that must not repaint on unrelated writes, key an
effect on the serialized setting (see `useWallpaper.js`). If the setting
replaces an old localStorage key, add a row to `legacySettings.js` and it is
moved once, at boot.

### Change the seeded disk

`addMachineCore` and `addMachineSystem` build the machine tree,
`addUserDocs` and `allProgramsTree` build a profile. Every node the seeder
emits is compared by path against existing stores, so:

- Adding a system node needs nothing else.
- Renaming or moving a system node: add the old path to
  `RETIRED_SYSTEM_PATHS`, and if shortcuts pointed at it, to
  `MIGRATED_TARGETS` (both in `context/vfs/boot.js`).
- A one-off repair of stored data is a named entry in `MIGRATIONS`; the
  sentinel records which ran, so it can be deleted once every store has it.
- A change existing stores cannot absorb (the layout of a profile, a
  shortcut format) is a `VFS_SCHEMA_VERSION` bump. Add a line to the log
  above the constant saying what changed and why. Bumping wipes and reseeds
  the disk, behind the recovery screen when the user has files of their
  own, so it is the last resort.

### Add a shell folder

One row in `SHELL_FOLDERS` (`kind`, `pattern`, `protected`, `icon`), a
constant in `profileFoldersFor`, and `specialFolder: kind` on the seeded
node so a renamed folder keeps its identity. Add it to Explorer's Other
Places, the address bar list and `FolderTree` if the shell listed it there.

### Add a Control Panel page

A category is a row in `CATEGORIES`, a classic applet a row in
`CLASSIC_APPLETS` (both `ControlPanel/categories.js`). A page of its own is
a view id in `FIXED_VIEWS` there, plus its renderer in the `content()`
switch of `ControlPanel/index.jsx`. Explorer refuses to navigate to a view
`isControlPanelView` does not know.

### Add a context-menu verb

`Icons/menus.js` builds the menu and emits an action string. If the verb
behaves the same on the desktop and in Explorer, handle it in
`shell/itemActions.js`; otherwise in the dispatcher of the surface that
owns it (`Icons/index.jsx` or `Explorer/index.jsx`).

### Add a sound, art, or a dialog

A sound is a key in `SOUNDS` (`sounds.js`) played with
`playSystemSound(key)`; it follows the volume and mute automatically. Art is
a file dropped into `src/assets/xp/` under the name `getArt` asks for. A
message box is `dlg.alert`, `dlg.confirm`, `dlg.confirm3` or `dlg.prompt`
from `useDialog()`; they queue, return promises and ignore the tail of the
keystroke that opened them.

### Add a taskbar or Start menu setting

A field in `START_MENU_DEFAULTS` (`startMenuConfig.js`), which
`mergeConfig` fills in for stored configs that predate it, and a control in
`TaskbarProperties` or `CustomizeStartMenu`. Uninstalling a program must
forget it everywhere; `scrubProgramRefs` is where that happens.

## DELTASCEND

The climbing game under `src/WinXP/apps/ClimbRace/` is a canvas game, not
a React tree, and it is the app most likely to keep growing. It runs on a
fixed 1/30 s step: `engine.js` owns the frame loop and the keyboard, and
everything else is a module of plain functions that take the game state as
their first argument.

| File | Holds |
| --- | --- |
| `state.js` | `createState`: every field the game has, grouped and commented. Add a field here first. |
| `constants.js` | the view size, the 40px tile, the step, easings, `cellKey` |
| `levels.js` | the three level records (church, generated, endless); `levelgen.js` plans a generated wall from a seed, `rooms/` is the church's room dump |
| `run.js` | loading a level, the timer and switch, and `tick`, the step that dispatches by `phase` and `mode` |
| `walker.js`, `kris.js` | Kris on foot, Kris on the wall (the climb state machine) |
| `hazards.js` | brittle cells, bells, coins, water streams, glow, particles |
| `endless.js` | THE FLOOD, grown ahead of the camera |
| `menu.js`, `dialog.js`, `cup.js` | the screens, the text box, the cup on the church floor |
| `secret.js`, `park.js`, `secretDraw.js` | the rooms behind the codes |
| `draw.js`, `board.js`, `backdrop.js`, `assets.js` | rendering: sprites and pixel fonts, the timer board, the painted walls, the tinted sprite copies |
| `sprites.js`, `sounds.js`, `fonts.js`, `dialogue.js` | the asset tables and the two widgets (the dark box, the code entry) |

The rules of the house:

- A field lives in `state.js`, with a comment saying what it is. Modules
  never keep game state in module-level variables; only caches of drawn
  assets live outside `game`.
- A function that reads or writes state takes `game` first. Functions on
  data alone (level builders, `cellKey`) do not.
- `tick` in `run.js` is the one place that decides what runs each step; a
  new phase or mode gets its branch there and its step function in the
  module that owns it.
- To add a hazard: its per-step behaviour in `hazards.js`, its drawing in
  the same file, its level data in the level record (`levels.js` for the
  church and endless, `levelgen.js` for generated walls).
- To add a level kind: a builder in `levels.js` returning the same fields
  as the others, a menu entry in `menu.js`, and only then branches on
  `L.kind` where the new kind really differs.

`tests/deltascend.spec.js` drives the engine frame by frame with the clock
and `Math.random` pinned and hashes the canvas at the end of each scenario.
The hashes are the game's behaviour. A refactor must leave them alone; a
deliberate change to the game updates them, and the scenarios are the
place to add coverage for a new feature.

## Tests

```bash
npm test                                  # the whole suite
npx playwright test tests/explorer.spec.js
npx playwright test --grep @smoke
npm run test:ui
```

The suite is Chromium against the real dev server (`npm start` on port
3000, reused when already running). Each test gets a fresh browser context,
so every test boots a new machine; `bootToDesktop(page)` uses `?guest` to
skip the ceremony, `startMenu(page, label)` clicks a Start menu row.
`page.__errors` collects uncaught errors, which the desktop would otherwise
turn into a BSOD; assert it is empty at the end.

Pure modules are tested by importing them straight from the dev server
inside `page.evaluate`:

```js
const { resolveLocation } = await import('/src/WinXP/shell/location.js');
```

`vfs-core.spec.js` builds a `FileSystem` over an in-memory `NodeStore` this
way and drives the filesystem rules directly. `invariants.spec.js` holds
the cross-checks between tables and the ratchets; when a ratchet fails, fix
the data rather than the number.

Specs are grouped by surface: `smoke`, `shell`, `window`, `explorer`,
`desktop`, `settings`, `recycle`, `persistence`, `recovery`, `bugs`
(regressions, one per fixed bug).

## Working practices

- `npm start`, `npm run build`, `npm run preview`. Lint and format with
  `npx eslint --fix src tests`; the config extends `react-app` and Prettier
  1.x, and the five `import/no-anonymous-default-export` warnings on the
  `dropDownData.js` files are known.
- Refactor in tranches: pin behaviour with a test, cut, run the suite, run
  the build. Do not commit half a tranche.
- Anything persisted is a compatibility surface: node fields, hive keys,
  the `RecycleBin` shortcut token, blob keys, the schema sentinel. Change
  the readers to accept the old shape rather than the stored data.
- The running list of what is done and what remains lives in the
  "webXP Codebase Audit" artifact; update a finding's status and note when
  you close it.
