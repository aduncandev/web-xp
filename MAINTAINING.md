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
| `src/context/VolumeContext.jsx` | The speakers: a master level and a level per program, per account in the hive. `useVolume()` inside a program follows that program's channel and gives it a mixer column. |
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
`taskbarLocked`, `wallpaper`, `appearance`, `screenSaver`, `sound`, `recentDocuments`,
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
`playSystemSound(key)`; it plays on the System Sounds channel and follows
the master and mute automatically. A program's own audio follows the mixer
through `useVolume()`: `effectiveVolume` is the 0..1 gain for that program
(master times its column) and `applyVolume(el)` keeps an element in step.
Calling the hook is what puts the program in the mixer while it is open; a
program that makes no sound never calls it and never gets a column. The
frame gives every program its channel, keyed by exe path, so there is
nothing to register. Art is
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

## Windows Media Player

`src/WinXP/apps/WindowsMediaPlayer/index.jsx` coordinates; the work is in
hooks and parts, and `tests/wmp.spec.js` pins the library search, playback,
the visualization buttons and playlists.

| File | Holds |
| --- | --- |
| `useLibrary.js` | the library's paths, Deleted Items and Tools > Options, all in the hive |
| `useTrackInfo.js` | tags, the user's tag edits, durations, playable URLs, session tracks (opened, dropped, URLs) |
| `usePlaylists.js` | saved `.m3u` playlists and the new/rename/delete dialogs |
| `usePlayback.js` | the media element, the audio graph, play/stop/step/nudge, carrying playback across tracks |
| `useVisualization.js`, `useAlbumArt.js` | the canvas loop and the current track's picture |
| `useTrackMenus.js`, `menuActions.js` | the right-click menus and the menu bar's verbs |
| `PlayerFrame.jsx`, `Transport.jsx`, `NowPlaying.jsx` | the skin, the deck, the screen and playlist pane |
| `skinImages.js` | the skin's bitmaps grouped by control |
| `views.jsx`, `chrome.js`, `panes.js`, `library.js`, `playlists.js`, `visualizations.js` | as before: the other tasks, the styled frame, the list styles, the library model, playlist files, the visualizations |

Anything that starts playback goes through `playTrack` or `playList` in
`index.jsx`; anything that changes what the player knows about a file goes
through `useTrackInfo`.

## Paint

`src/WinXP/apps/Paint/index.jsx` holds the tool and view state and wires the
parts below; `tests/paint.spec.js` pins drawing, undo and redo, the fill
tool, Attributes and Save As.

| File | Holds |
| --- | --- |
| `useDocument.js` | the two canvases (picture and preview overlay), the page size, the undo and redo stacks of pixel snapshots |
| `useSelection.js` | the floating selection: lift, drag, commit, cut, copy, paste, Select All, the transparent-select filter |
| `useTextTool.js` | the text box while it is being typed into, committed by drawing it onto the page |
| `useFiles.js` | the current path, the dirty flag, Open and Save through the filesystem, "Save changes?" on close, Set As Background |
| `tools.js` | one entry per tool in `TOOL_DOWN`; a mouse-down looks the tool up and drags with `startDrag` |
| `imageOps.js` | the Image menu and the page's resize handles: Attributes, Flip/Rotate, Stretch/Skew, Invert, Clear |
| `shortcuts.js` | the keyboard table |
| `menus.js` | the menu bar, built from the current state so the disabled rows are right |
| `ToolOptions.jsx`, `ColorBox.jsx`, `PaintCanvas.jsx` | the box under the tools, the palette, the page with its marquee, text box and handles |
| `constants.js`, `helpers.js`, `raster.js`, `dialogs.jsx`, `styles.jsx` | as before: the tool list and palette, canvas helpers, flood fill and BMP encoding, the three sub-dialogs, the styled frame |

Every tool and operation receives the same `paint` bag, which `index.jsx`
refills each render: `doc`, `live` (a ref mirroring the current state, so
handlers attached to `window` never see stale values), `selection`, `text`,
the in-progress refs, and the setters. Anything that changes the picture
calls `paint.doc.pushUndo()` first and `paint.setDirty(true)` after; the
Image menu verbs call `paint.settle()` before they start, which commits
pending text and a floating selection and drops a half-drawn curve or
polygon, as Paint does.

To add a tool: add it to `TOOLS` in `constants.js` (the glyph is the next
16px cell of `assets/paint/tools.png`), add an entry to `TOOL_DOWN` in
`tools.js`, and add its option panel to `ToolOptions.jsx` if it has one.

## XP Shop

`src/WinXP/apps/Store/index.jsx` holds the parts together and renders the
screen the navigation stack names; `tests/store.spec.js` pins the splash,
downloading and deleting a free title, the category cards, the search
keyboard, a refused paid title and the sound switches.

| File | Holds |
| --- | --- |
| `useShopAccount.js` | eggs, the points balance, purchased titles, read news and the tallies, all in the profile hive |
| `useShopAudio.js` | the hover blip and the cues, the loading whirl, the two-part music, the two switches in localStorage |
| `useShopNav.js` | the stack of screens with their bits (shelf, title, list mode, page), Back, jump-to-title |
| `useScaledStage.js` | the 608x456 page scaled to the window |
| `catalogView.js` | the catalog with live install state, price labels, what Start/Play/Open does |
| `screens/` | one component per screen, keyed by name in `screens/index.js` |
| `parts.jsx` | the page title and rules, footer buttons, points badge, Back footer, paged list and pager |
| `WgArrows.jsx` | the welcome shelf's drifting arrows |
| `styles/` | the channel's stylesheet split by page (`chrome`, `welcome`, `mainMenu`, `lists`, `titlePage`, `pages`, `keyboard`), concatenated in that order by `styles/index.js`; `tokens.js` has the palette and keyframes |
| `constants.js`, `art.jsx`, `catalog.js`, `sfx.js`, `Keyboard.jsx`, `MarioDownload.jsx` | the shelves, the preserved artwork, the catalog and install/uninstall, the sounds, the search keyboard, the download animation |

Every screen receives the same `shop` bag: `cur` (the top of the stack),
`nav`, `apps` and `byId`, `account`, `audio`, `ui` (page memory that
outlives a page, like the welcome shelf's group), `vfs`, `userName`,
`onClose` and `onShellOpen`. Anything that changes the shopper's state goes
through `account`; anything that moves between pages goes through `nav`.
The user is captured at mount, so a window that survives a fast user switch
keeps trading its own user's eggs.

To add a screen: write `screens/Thing.jsx` taking `{ shop }`, add it to
`SCREENS`, and `nav.go('thing', { ...bits })` to it. To add a title, edit
`catalog.js` only; the invariants spec checks it against the program
registry.

## Themes

`src/WinXP/theme/` is the one place the shell's colours, bitmaps and metrics
live. Luna, the Windows XP style, is drawn from the real `luna.msstyles`:
`tools/luna-export.py` exports every part bitmap of its three colour schemes
into `src/assets/xp/luna/<scheme>/` with the states split and a
`parts.json` of the style's INI (sizing margins, colours, fonts,
`[SysMetrics]`). `lunaArt.js` reads them and `tokens.js` turns an appearance
setting (`style`, `scheme`, `fontSize`, hive key `appearance`) into CSS
custom properties on the document root: colours as `--xp-face`,
`--xp-highlight` and so on, and each part's states as border-image values,
`--xp-p-window-caption-1`, `--xp-p-taskband-toolbar-button-5`, with
`--xp-g-…` for a part's glyph and `--xp-i-…` for a plain state image.
Components draw with `border-image: var(--xp-p-…, none)` and
`image-rendering: pixelated`, so a scheme switch is a variable switch and
every portal sees it. The window frame, caption buttons (Minimize,
Maximize, Close and the Help button property sheets ask for with
`header.buttons`), the taskbar, tray, task buttons and Start button, the
Start menu's bands, Explorer's bars and panes, tabs, group boxes, sliders,
spin buttons, combo boxes, check boxes and scrollbars all come from parts. The session on screen applies its user's setting
(`useAppearance` in `WinXP/index.jsx`); the Welcome screen and Setup stay
Luna Blue, as XP's do.

Windows Classic is built from a scheme's system colours (`classicSchemes.js`,
the eighteen schemes XP ships as `R G B` tables) by `classicTokens`; the
part variables are unset, so the `none` fallbacks apply, and `classic.css`,
keyed on `html[data-xp-style='classic']` and the class hooks `xp-window`,
`header__buttons`, `xp-taskbar`, `xp-startmenu`, `xp-menu`, `xp-submenu`,
`xp-button`, `xp-select`, `xpdlg`, does the 3D drawing.

Display Properties drives it: the Appearance tab edits the three fields and
previews them in a `MiniDesktop` drawn from the pending tokens; the Themes
tab maps Windows XP and Windows Classic onto an appearance plus a
background. `tests/appearance.spec.js` pins both.

To theme a new part: add its INI section to `PARTS` (or `IMAGES`) in
`tokens.js`, then draw with the variable. To check a part's margins or
states, read `parts.json`. To add a classic scheme, add its colour table to
`CLASSIC_SCHEMES`.

Three things bite when drawing with the parts. A border-image paints over
the element's background, so a part's glyph (`--xp-g-…`) goes in a
`::after` overlay, never in `background`; the caption buttons, the combo
button and the spin buttons do this. A part variable is a border-image
value and nothing else: `background: var(--xp-p-…)` is an invalid
declaration and the element goes transparent, which is how the taskbar
once lost its bitmap. Scrollbar pseudo-elements have no `::after`, so
`lunaScrollbars.js` draws the arrows as two background layers (glyph over
the plain 17x17 state image, `--xp-i-scrollbar-arrowbtn-…`) and the thumb
as its nine-sliced edges without `fill` (`--xp-pn-…`) over the exporter's
`-mid` slice of its middle; Chromium also needs
`::-webkit-scrollbar-button { display: block }` before it draws buttons at
all, and headless Chromium hides scrollbars unless launched with
`ignoreDefaultArgs: ['--hide-scrollbars']`.

Windows Classic was checked against a real Windows XP SP3 in QEMU; the
1:1 captures of both styles (Display Properties' tabs and dialogs, the
Start menu, Explorer, Notepad, Run, a message box, caption button states)
are in `refkit/vm/`, with every stock program's window, menus and dialogs
from a tour of the VM and the notes from comparing them in
`refkit/vm/TOUR.md`. `image-rendering: pixelated` inherits, so `index.css`
sets `img` back to `auto`: icons scale smoothly, the chrome stays pixel
for pixel. The Classic glyphs in `src/assets/xp/classic/`
(caption buttons, Help, the task pane chevrons, the combo and scrollbar
arrows, the menu arrow) are cut from those captures as black-on-transparent
masks and drawn with `mask-image` in the button-text colour, so every
scheme recolours them; a pressed button shifts its glyph by a pixel, a
disabled one etches it. Win32's raised edge runs face, white, then shadow
and dark shadow on the far side; `classic.css` keeps that order on windows,
dialogs, menus and the Start menu.

Display Properties (`system/DisplayProperties/`) is laid out at XP's own
coordinates, measured on the VM: the sheet is 402x454, its tab page 384x357
at (8, 53), buttons 75x23 on a 6px gap, and every control of every tab sits
where XP puts it (`at()` maps dialog coordinates into the page). The sample
in the Themes and Appearance tabs draws real chrome at full size from the
pending appearance's own tokens, Classic included. `EffectsDialog.jsx` is
XP's Effects dialog; its settings ride on the appearance as `effects` and
reach the document as `data-xp-menu-fade`, `data-xp-menu-shadow` and
`data-xp-underlines` (see `index.css`), which the menus and the Start menu
read.

### Dialog frames and sheet layout

- XP draws dialogs with a fixed 3px frame (SM_CXFIXEDFRAME), sizable windows
  with 4px. Luna's frameLeft/frameRight bitmaps are 5 columns with 2px
  sizing margins; a dialog shows columns 1, 3 and 4 of them (checked
  against captures), the bottom frame rows 0, 3 and 4. `tools/luna-export.py`
  writes the cut `frameLeft-dlg-N.png` / `frameRight-dlg-N.png`, and
  `tokens.js` exposes them as `--xp-p-window-frame{left,right,bottom}-dlg-N`
  with `--xp-dlg-frame-w` (3px) and `--xp-dlg-caption-total` (Luna 29,
  Classic 21). `XPDialogFrame` redefines the window vars from those; an app
  window does the same when its header config has `dialogFrame: true`
  (Display Properties). A Luna dialog measured in the VM is 404x455 with
  its client at (3,29).
- `src/components/XPDialogFrame/layout.js` holds `dialogAt(x, y, w, h)`:
  positions typed straight from a capture, relative to the dialog's outer
  top-left corner. Taskbar Properties, Folder Options and Display
  Properties (`rootAt`, corrected for its older measurement origin) use it.
  Push buttons are 75x23 boxes: the bitmap's outline sits one pixel inside
  them, on the rows the real 73x21 button occupies.
- Tab strips share the rules in `luna.css`/`classic.css`: unselected tabs
  18px with 6px padding and a 38px minimum width, the selected one 2px
  taller and wider with negative side margins so it overlaps its neighbours
  instead of pushing them. Luna strips start at dialog x 11, Classic at 9.
  Group boxes are `fieldset.xp-group` so the border breaks around the
  legend as the control does; the legend is pinned to 13px or its border
  lands on a half pixel.
- Taskbar Properties' previews are captures, not explorer.exe's bitmaps:
  XP SP2 paints its Media Player icon out of them. `taskbar-146..153.png`
  index as 146 + unlocked + 2*ungrouped + 4*noQuickLaunch,
  `tray-180..183.png` as 180 + noClock + 2*showAllIcons.
- Explorer's Details header: the row is the `Header` part's background
  (1x17, stretched to 20px), each column the `Header.HeaderItem` part, and
  the sort arrow a 9x5 triangle 10px past the label in the gray text
  colour (`.com__sort`); Classic draws raised 20px buttons with the arrow
  in the shadow colour. The sorted column's cells are tinted #f7f7f7.
- `scratchpad/xp/icons.py` must ask Pillow for the deepest frame of a size:
  its default is the 4-bit one, which is where the "Windows 98" looking task
  pane icons came from. The task pane icons now match the VM's pixels
  exactly (shell32 319, 244, 267, 35, 4, 16, 18, 22, 235, 1007; appwiz 1500).

### Display scaling and seams

Windows at 125% or 150% display scaling gives the browser a device pixel
ratio of 1.25 or 1.5; a macOS retina display gives 2, and an unscaled
monitor gives 1. On the fractional ratios the browser rounds each nine-slice
rectangle on its own, so hairlines appear between the slices and read as
seams across the chrome's gradients. Reproduce with Playwright's
`deviceScaleFactor` at 1.25 and 1.5; nothing shows at 1 or 2.

- The desktop keeps its size at every ratio. Aligning stage pixels to whole
  device pixels would fix the seams outright, but at 1.25 the only aligned
  scales are 0.8 and 1.6, and shrinking the desktop by a fifth is worse than
  the seams. `tests/scaling.spec.js` pins the size, the letterboxed case and
  the pointer maths.
- The cure is an underlay: `UNDERLAY_PARTS` in `theme/tokens.js` exposes a
  part's whole bitmap as `--xp-u-<slug>-<n>`, and the sites that draw those
  parts paint it at `100% 100%` under the nine slices, so a hairline shows
  the part's own colours instead of a gap. It covers the Start button, the
  taskbar and tray backgrounds, the task buttons, the Start menu's user pane
  and log-off bands, and Explorer's task pane cards. `tools/seamscan.py`
  finds the rest: it reports one-pixel rows and columns that differ from
  both neighbours, run it on a crop taken at 1.25 and again at 1.
- Parts drawn at their natural size are painted as plain background images
  and never sliced: the caption buttons (21x21, `--xp-i-window-*button-N`),
  the scrollbar arrows, check boxes and radio buttons. Classic blanks
  `background-image` on those buttons in every state so Luna's art cannot
  leak in on hover.
- Luna's `--xp-frame-active` / `--xp-frame-inactive` are the frame bitmap's
  inner column (`frameEdge` in parts.json, written by `tools/luna-export.py`),
  so a hairline between the window's four frame pieces shows the frame's own
  colour rather than the desktop. It is painted as a gradient that stays
  transparent for the top `--xp-frame-corner` rows (Luna 6px, Classic 0),
  because the caption bitmap's rounded corners are transparent pixels that
  must keep showing the desktop; a flat colour there squares the window off.
- On a fractional ratio `screen.js` sets `data-xp-fractional="1"` on the
  root and `index.css` switches every bitmap but canvases to
  `image-rendering: auto`. Nearest-neighbour cannot draw a 21px button into
  26.25 device pixels without doubling some rows and not others, which tears
  the close button's outline; interpolation is even. Integer ratios keep
  drawing pixel for pixel.

## The screen

`src/WinXP/screen.js` is Display Properties' Settings tab. The desktop is
laid out on a stage (`#xp-stage` in `App.jsx`) of the chosen resolution and
the stage is scaled down, never up, to fit the browser window and centred,
black around it where the shapes differ: a 1024x768 desktop in a wide
window sits between two black bars. Fullscreen is the browser window
itself. The DPI setting draws fewer, larger logical pixels on the same
stage. Colour quality Medium (16 bit) is an SVG filter that steps colours
to 5-6-5. The setting is machine state in localStorage, like XP's
per-display settings, and applies only while the desktop is on screen
(`enterScreen`/`leaveScreen`); the logon and boot screens draw at the
browser's own size.

The shell lays out in stage pixels and the browser reports pointer events,
client rects and `innerWidth` in screen pixels, so code that touches either
converts: `toLogicalX`/`toLogicalY` for a point, `toLogical` for a delta,
and `screenSize()` or `useScreenSize()` instead of `window.innerWidth`.
Portals mount inside the stage through `portalRoot()`, so a fixed position
is a stage position. The window frame, icon drag, both rubber bands, list
columns, Solitaire, Paint, the picture viewer, context menus, tooltips,
drop-down lists and dialog dragging all do this; a new gesture must too, or
it will move at the wrong speed under a scale. `tests/display.spec.js` drags
a window and opens a menu at two thirds scale to prove the conversions.

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
