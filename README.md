# webXP

An attempt at a fully interactive Windows XP desktop, built with React.

## [Try it live](https://webxp.net) (mirrored at [aduncan.dev](https://aduncan.dev))

## Features

### Desktop Environment

- Draggable, resizable windows with minimize, maximize, and close
- Start menu with pinned programs, most-used tracking, and nested submenus mirroring real XP structure
- Taskbar with running app buttons, Quick Launch, system tray clock, and volume control
- Desktop icons with click-to-select and drag-to-select (rubber band)
- Window focus and z-ordering, global volume with mute
- Screensavers: 3D Pipes, 3D Text, and Flying Objects
- BSOD triggered by any unhandled JS error, with the real error in the stop code
- Control Panel with working applets: Display Properties, System Properties,
  User Accounts, Folder Options
- Task Manager whose Applications tab reflects the real open windows, with the
  classic animated Performance graphs
- Recycle Bin that really holds deleted files, restores them where they came
  from, and empties
- Compressed (zipped) folders: browse an archive in place, extraction wizard,
  password-protected zips
- Drag and drop between the desktop and Explorer windows, with align to grid,
  auto arrange, and per-user icon layouts

### Boot, Login & Accounts

- A first visit lands on a BIOS-style boot device menu — click the CD to run setup
- The XP setup wizard creates your accounts, then the machine reboots into them
- Animated boot screen, login screen, welcome chime, shutdown/restart loop
- Custom account pictures, Log Off / Switch User, per-user files and settings
- Fast user switching keeps switched-out sessions running in the background
- Accounts can take a password with a hint; a password protects the account
  itself, so nobody else can rename, delete, or unlock it
- The Guest account can be turned on and off from Control Panel, like real XP
- Control Panel > User Accounts > "Skip the startup screen" boots straight to
  the login screen on later visits
- [webxp.net/?guest](https://webxp.net/?guest) skips setup entirely: it makes
  a Guest account and drops you at the login screen

### Filesystem

- Files you save (drawings, notes, downloads) go into an IndexedDB-backed filesystem and persist between visits
- Windows Explorer browses it for real: navigation, shortcuts, file associations,
  Open With, drive letters, the folders tree, and the XP view modes
- Programs are files too — the executables live on the disk, so a shortcut, the
  Run box, and cmd all launch the same way the shell does
- Backup or Restore Wizard exports the whole machine to a zip and restores it
- A recovery screen protects user files when an update changes the disk format

### The XP Shop

- A recreation of the Wii Shop Channel, rebuilt from preserved pages of the real one
- Sells optional apps that install and uninstall live, plus music and other extras that download into your own folders
- Welcome shelves, catalog pages, category search, and an on-screen keyboard for title search
- Some titles cost XP Points

### Applications

| App | Description |
|-----|-------------|
| **Calculator** | Standard and Scientific modes. |
| **Command Prompt** | A real cmd.exe: `dir`, `copy`, `tree`, `attrib`, `ipconfig`, `ping`, `tasklist`, `taskkill`, `shutdown`, `start` and more, wired to the live filesystem and shell. |
| **Guest Book** | Sign the site. Entries go to a self-hosted backend that filters and publishes them (see below). |
| **Internet Explorer** | In-app browser with address bar, history, and back/forward. Loads any URL in an iframe. |
| **Minesweeper** | Fully playable with three difficulties, flags, chording, timer, and mine counter. |
| **Notepad** | Opens and saves real files. File/Edit/Format menus, word wrap, cursor tracking. |
| **Paint** | MS Paint recreation. Draws, opens, and saves real image files. |
| **Solitaire** | Klondike with draw one or draw three, Standard or Vegas scoring. |
| **Windows Explorer** | File explorer over the site's filesystem: task pane, folders tree, address bar, and the XP view modes. |
| **Windows Picture and Fax Viewer** | Opens images from the filesystem with the real toolbar. |
| **WordPad** | Rich text editing that saves real `.rtf` files. |
| **Winamp** | Real Winamp 2.x via [webamp](https://github.com/captbaritone/webamp), playing whatever is in My Music. |
| **Windows Media Player** | Music, video, and picture playback with playlists and a library view. |
| **3D Pinball** | Space Cadet pinball via the [98.js.org](https://98.js.org) WebAssembly port. |
| **Voltorb Flip** | The Pokemon HG/SS card game, based on [steiner26/voltorbflip](https://github.com/steiner26/voltorbflip) with added sound and music. |
| **PictoChat** | Self-hosted, lightly modified [ayunpictojava](https://github.com/ayunami2000/ayunpictojava) at [chat.aduncan.dev](https://chat.aduncan.dev). |
| **webXP Tour** | Guided tour of the site in the style of "Take a tour of Windows XP". |
| **???** | egg... open it and find out... |

The XP Shop has more: Mario vs Luigi
([NSMB-MarioVsLuigi](https://github.com/ipodtouch0218/NSMB-MarioVsLuigi)),
DELTASCEND (an original Deltarune-styled climbing race with a level maker),
a Media Tag Editor, the old Media Player, and downloadable music.

### Guest Book

Visitors can sign a guest book from inside the desktop. It is the only part of
the site with a server: [`server/guestbook`](server/guestbook) is a small Node
service (Node 22+, `node:sqlite`, no native dependencies) that stores entries and
decides what gets published.

- Submissions pass through a layered filter: shape checks, bans, rate limits,
  hidden traps, a proof-of-work stamp, duplicate detection, and text heuristics
  that normalise away the usual evasions
- Anything still ambiguous goes to a capped, budgeted classifier pass; anything
  that fails outright is stored redacted or not at all
- Moderation runs over Discord — new entries arrive as messages that can be
  approved, held, deleted, or replied to
- No file uploads, by design. Everything a visitor makes stays in their own
  browser; the guest book is text only

Its own [README](server/guestbook/README.md) covers setup, environment variables,
and the nginx example config. The site runs fine without it — the app just
reports that the guest book is offline.

### Privacy

The site stores what you make in your own browser and sends nothing anywhere,
apart from a guest book entry you choose to submit. The in-desktop privacy notice
and `privacy.txt` are generated from one source, so they cannot drift apart.

### Audio

System sounds play for boot, login, logoff, shutdown, errors, and tray balloons. Everything respects the global volume and mute, including the embedded games.

## Getting Started

Changing the code? [MAINTAINING.md](MAINTAINING.md) maps the tree, explains
how the pieces fit, and has step-by-step recipes for adding programs, file
types, settings, shell folders and tests.

### Prerequisites

- A recent Node.js LTS

### Install & Run

```bash
git clone https://github.com/aduncandev/web-xp.git
cd web-xp
npm install
npm start
```

The dev server starts at `http://localhost:3000`.

### Build for Production

```bash
npm run build
```

Output goes to `dist/`. Preview locally with `npm run preview`.

### Hosting a fork

The code is MIT, so forks are welcome. Keep the LICENSE and credits, and swap out the personal content (see License) for your own.

## Tech Stack

- **React 18** with hooks and useReducer for state management
- **styled-components** for all styling
- **Vite** for dev server and builds
- **IndexedDB** for the filesystem, with a schema version that triggers the
  recovery screen when the disk format changes
- **Node 22+** for the optional guest book backend, using the built-in
  `node:sqlite` so there is nothing to compile

## Credits

This project is a fork of [winXP](https://github.com/ShizukuIchi/winXP) by [ShizukuIchi](https://github.com/ShizukuIchi). The original desktop, window manager, and first apps came from there.

Code this site uses or builds on:

- [webamp](https://github.com/captbaritone/webamp) by Jordan Eldredge
- [voltorbflip](https://github.com/steiner26/voltorbflip) by steiner26, the base for Voltorb Flip
- [ayunpictojava](https://github.com/ayunami2000/ayunpictojava) by ayunami2000, self-hosted for PictoChat
- [NSMB-MarioVsLuigi](https://github.com/ipodtouch0218/NSMB-MarioVsLuigi) by ipodtouch0218 and contributors
- [Pipes](https://github.com/1j01/pipes) by Isaiah Odhner, and the [98.js.org](https://98.js.org) build of [SpaceCadetPinball](https://github.com/k4zmu2a/SpaceCadetPinball)
- [jspaint](https://github.com/1j01/jspaint) by Isaiah Odhner powered Paint here for a long time and was the reference for the current in-house version
- [three.js](https://threejs.org/) for the screensavers, [chance.js](https://chancejs.com/) in Voltorb Flip, Noto Sans under the SIL OFL

Assets:

- Wii Shop Channel pages, art, and sounds recreated from the preservation work at [wiishopchannel.net](https://wiishopchannel.net)
- Windows XP art, sounds, and fonts belong to Microsoft
- The Wii Shop Channel, Mario, PictoChat, and Voltorb Flip belong to Nintendo, Game Freak, and The Pokemon Company
- Undertale references belong to Toby Fox; the Determination Mono fan font is by Haley Wakamatsu
- The three original songs in the shop album are mine (Skillz Productions); other seeded sounds and music belong to their owners

If something of yours is in here and credited wrong or not at all, open an issue and I'll fix it.

## License

The code is [MIT](LICENSE): copyright 2019 Shizuku Yang (winXP), copyright 2025-2026 Aaron Duncan (everything since).

The license does not cover my personal content: the original music, personal images and text, and the webxp.net / aduncan.dev / Skillz identity. Replace those in forks.

Microsoft and Nintendo material appears here as part of a non-commercial fan recreation. This project is not affiliated with or approved by Microsoft or Nintendo.
