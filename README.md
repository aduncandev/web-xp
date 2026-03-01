# Skillz's Computer

A personal portfolio website disguised as a fully interactive Windows XP desktop, built with React.

## [Try it live](https://aduncan.dev)

[![](https://imgur.com/a/QE8bMaR#9ZpVeqH)](https://aduncan.dev)

## Features

### Desktop Environment

- Draggable, resizable windows with minimize, maximize, and close
- Start menu with nested submenus mirroring real XP structure
- Taskbar with running app buttons, system tray clock, and volume control
- Desktop icons with click-to-select and drag-to-select (rubber band)
- Window focus and z-ordering (click to bring to front)
- Global volume control with mute, persisted to localStorage

### Boot & Login Sequence

- Animated boot screen with XP loading bar
- Login screen with two user accounts (Skillz and Administrator)
- Welcome screen with transition to desktop
- Log Off and Turn Off Computer dialogs with Switch User support
- Shutdown/restart animation (grayscale fade) and reboot loop
- BSOD triggered by any unhandled JS error, with the real error in the stop code

### Applications

| App | Description |
|-----|-------------|
| **Internet Explorer** | In-app browser with address bar, navigation history, back/forward, and toolbar. Loads any URL in an iframe. |
| **Minesweeper** | Fully playable with Beginner, Intermediate, and Expert difficulties. Flag/question marks, chord clicking, timer, and mine counter. |
| **My Computer** | Navigable mock file explorer with folders, back/forward/up navigation, sidebar details, and address bar. |
| **Notepad** | Text editor with File (New/Open/Save), Edit (Time/Date), Format (Word Wrap), and cursor position tracking. |
| **Winamp** | Real Winamp 2.x player via the [webamp](https://github.com/nicknisi/webamp) library with a 5-track playlist. |
| **Paint** | Full MS Paint via [jspaint.app](https://jspaint.app) embedded in an iframe. |
| **Media Player** | Custom audio/video/image player with real-time frequency visualizer, drag-and-drop file import, sortable playlist, seek bar, and loop toggle. |
| **3D Pinball** | Space Cadet pinball via [98.js.org](https://98.js.org) WebAssembly build. |
| **Voltorb Flip** | The Pokemon HG/SS card game, hosted locally with iframe volume sync. |
| **PictoChat** | Embedded chat app from [chat.aduncan.dev](https://chat.aduncan.dev). |
| **About Me** | XP wizard-style portfolio page with skills, projects, and contact info. |
| **???** | egg... open it and find out... |

### Audio

System sounds play for boot, login, logoff, shutdown, errors, and the system tray balloon notification. All sounds respect the global volume and mute state.

## Getting Started

### Prerequisites

- Node.js >= 14

### Install & Run

```bash
git clone https://github.com/aduncandev/NewWebsite.git
cd NewWebsite
npm install
npm start
```

The dev server starts at `http://localhost:3000`.

### Build for Production

```bash
npm run build
```

Output goes to `dist/`. Preview locally with:

```bash
npm run preview
```

## Tech Stack

- **React 18** with hooks and useReducer for state management
- **styled-components** for all styling
- **Vite** for dev server and builds
- **webamp** for the Winamp player
- **react-use** for mouse tracking and window size hooks

## License

The Windows XP name, artwork, and trademark are property of Microsoft. This project is provided for educational purposes only. It is not affiliated with and has not been approved by Microsoft.

## Credits

- [Webamp](https://github.com/captbaritone/webamp) — Winamp 2 reimplementation by [captbaritone](https://github.com/captbaritone)
- [JS Paint](https://github.com/1j01/jspaint) — Paint reimplementation by [1j01](https://github.com/1j01)
- [98.js](https://98.js.org) — 3D Pinball Space Cadet WebAssembly port
