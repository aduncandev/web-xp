# Real XP art drop-in folder

Put genuine Windows XP assets here (PNG with alpha preferred; gif/jpg/ico/bmp
also work). Anything matching the names below automatically replaces the
hand-drawn placeholder — no code changes needed.

**Status (2026-08-17): all the icons below are now REAL** — downloaded from
the softwarehistorysociety/XPIcons archive (extracted XP resources, served
via jsDelivr). Replace any of them with your own higher-res extractions any
time; same names. Toolbar Back/Forward/Up/Search/Folders/Views/Go were
already genuine assets in src/assets/windowsIcons and need nothing.
Still wanted (optional): `cardback-1.png`… (Solitaire backs, cards.dll),
`title.mp3` (OOBE music → public/music/), and the Start button state bitmaps
`start-hover.png` / `start-pressed.png` (until dropped in, the base
start.png is tinted with CSS brightness as a placeholder).
The five power orbs (`power-standby/turnoff/restart/switchuser/logoff.png`)
are now real XPIcons assets, verified against refkit turn-off/log-off dialog
screenshots.

| File name              | What it replaces                          | Where to find the original                          |
| ---------------------- | ----------------------------------------- | --------------------------------------------------- |
| `oobe-next.png`        | OOBE green Next arrow button (~44px)      | `C:\WINDOWS\system32\oobe\` html/images resources   |
| `oobe-back.png`        | OOBE green Back arrow button — the file currently here is the WRONG (orange) variant; the UI mirrors `oobe-next.png` instead until the real green one is dropped in | same |
| `oobe-help.png`        | OOBE glossy blue "?" orb (round, silver ring) | XPIcons `HelpandSupport.png` (replaced an earlier square variant) |
| `LoginGo.png`          | Welcome-screen green OK arrow button (high-res) | XPIcons `Go.png` |
| `msg-error.png`        | Dialog red X icon (32px)                  | `user32.dll` (IDI_ERROR)                            |
| `msg-warning.png`      | Dialog yellow ! triangle (32px)           | `user32.dll` (IDI_WARNING)                          |
| `msg-info.png`         | Dialog blue i icon (32px)                 | `user32.dll` (IDI_INFORMATION)                      |
| `recycle-empty.png`    | Recycle Bin empty (32/48px)               | `shell32.dll` icon #31                              |
| `recycle-full.png`     | Recycle Bin full                          | `shell32.dll` icon #32                              |
| `application.png`      | Generic .exe file icon                    | `shell32.dll` icon #2                               |
| `dll.png`              | .dll/.sys file icon                       | `shell32.dll` (gear-page icon)                      |
| `display.png`          | Display Properties monitor icon (16+32)   | `desk.cpl` icon #1                                  |
| `taskmgr.png`          | Task Manager window icon (16px)           | `taskmgr.exe` icon #1                               |
| `cpl-appearance.png`   | Control Panel: Appearance and Themes (48) | XP Control Panel category art (`shell32.dll`)       |
| `cpl-network.png`      | Network and Internet Connections          | same                                                |
| `cpl-addremove.png`    | Add or Remove Programs                    | `appwiz.cpl`                                        |
| `cpl-sounds.png`       | Sounds, Speech, and Audio Devices         | `mmsys.cpl`                                         |
| `cpl-performance.png`  | Performance and Maintenance               | shell32                                             |
| `cpl-printers.png`     | Printers and Other Hardware               | shell32                                             |
| `cpl-accounts.png`     | User Accounts                             | `nusrmgr.cpl` art                                   |
| `cpl-datetime.png`     | Date, Time, Language, Regional            | `timedate.cpl`                                      |
| `cpl-accessibility.png`| Accessibility Options                     | `access.cpl`                                        |
| `cpl-security.png`     | Security Center                           | `wscui.cpl`                                         |
| `cardback-1.png` …     | Solitaire deck backs (71×96, optional)    | `cards.dll`                                         |
| `power-standby.png`    | Turn off computer: amber Stand By orb (33px, crescent moon) | `msgina.dll` bitmap resources         |
| `power-turnoff.png`    | Turn off computer: red Turn Off orb (power symbol) | `msgina.dll` bitmap resources                  |
| `power-restart.png`    | Turn off computer: green Restart orb (curved arrow) | `msgina.dll` bitmap resources                 |
| `power-switchuser.png` | Log Off Windows: Switch User orb          | `msgina.dll` bitmap resources                       |
| `power-logoff.png`     | Log Off Windows: Log Off orb              | `msgina.dll` bitmap resources                       |
| `sysdm.png`            | System Properties 16px window icon        | `sysdm.cpl` icon #1 (XPIcons, downscaled)           |
| `guestbook.png`        | WANTED: Guest Book app icon (16+32). Internet Explorer's Favourites book stands in until this is dropped in. | `wab.exe` icon #1 (Address Book) |
| `sysdm-general.png`    | WANTED: General-tab monitor+flag bitmap (the UI shows the plain flag crop until this is dropped in) | `sysdm.cpl` bitmap resources |
| `DisplayMonitor.png`   | Display Properties CRT monitor bitmap (182x164) | cropped from refkit display-properties-settings.png (ground truth) |
| `SliderThumb.png`      | Luna slider thumb (11x21)                 | cropped from refkit display-properties-settings.png (ground truth) |
| `AboutBanner.png`      | About Windows (winver) banner, 413x75     | cropped from refkit about-windows.png (ground truth) |
| `VolumeThumb.png`      | Tray volume slider thumb (green-capped, stored pre-rotated 11x22) | cropped from refkit volume-1.png (ground truth) |
| `PinballSplash.png`    | 3D Pinball startup splash (320x222, 8bpp), shown fullscreen while the table loads | REAL — the `SPLASH_BITMAP` resource extracted from `PINBALL.EXE` |
| `checkbox.png`         | Luna check box, unchecked (13x13)         | cropped from refkit display-properties-screensaver.png (ground truth) |
| `checkbox-checked.png` | Luna check box, checked green tick (13x13)| cropped from refkit date-time-2.png (ground truth)  |
| `radio.png`            | Luna radio button, unselected (13x13)     | cropped from GUIdebook `settings/mouse/winxppro-1-4.png` Wheel tab (ground truth); dialog-face corners keyed to alpha |
| `radio-checked.png`    | Luna radio button, selected green dot (13x13) | same shot, same crop rules                      |
| `pfv-*.png`            | Windows Picture and Fax Viewer toolbar, 14 glyphs at 16x16 (`prev`, `next`, `fit`, `actual`, `slideshow`, `zoomIn`, `zoomOut`, `rotateCw`, `rotateCcw`, `delete`, `print`, `copyTo`, `edit`, `help`) | cropped 1:1 from a real XP `shimgvw.dll` screenshot; toolbar face keyed to alpha |
| `pfv-ss-*.png`         | Slide-show overlay controls, 16x16 (`play`, `pause`, `prev`, `next`, `close`) | same, from the full-screen slide show's top-right bar |
| `folder-watermark-{music,pictures,videos}.png` | Shell folder watermarks, bottom-right of the file area | cropped 1:1 from real XP My Music / My Pictures / My Videos windows |
| `folder-hidden-watermark.png` | Computer glyph on the "These files are hidden" panel (301x268) | cropped 1:1 from a real XP Program Files window; sits on `#6375D6` |
| `tree-plus.png` / `tree-minus.png` | Explorer Folders-pane expander boxes (9x9) | cropped 1:1 from a real XP Folders tree — a bordered box with a vertical interior gradient, not a drawn +/- character |
| `{MyDocuments,MyMusic,MyPictures,MyVideos}16.png` | 16x16 shell folder icons for the title bar, address bar and lists | cropped 1:1 from each folder's address bar (white keyed to alpha) — the shell ships distinct 16px art, not downscales of the 32px icon |
| `cpl-system.png`       | Control Panel: System applet (48px)       | `sysdm.cpl` icon #1 (XPIcons, downscaled)           |
| `start.png`            | Start button normal bitmap (optional)     | `explorer.exe` bitmap resources                     |
| `start-hover.png`      | Start button hover bitmap (bright green)  | `explorer.exe` bitmap resources                     |
| `start-pressed.png`    | Start button pressed bitmap (sunken green)| `explorer.exe` bitmap resources                     |

## Luna scrollbar bitmaps (REAL — pixel crops from authentic XP screenshots)

Cropped at 100% from GUIdebook Gallery ground-truth shots (Display Properties
Desktop-tab list scrollbar; Search Results horizontal scrollbar), which render
the genuine `luna.msstyles` bitmaps. Assembled globally by the desktop
Container in `src/WinXP/index.jsx` via `::-webkit-scrollbar`.

| File name                   | What it is                                      |
| --------------------------- | ----------------------------------------------- |
| `scroll-up.png`             | Vertical scrollbar up button, 17x17, normal     |
| `scroll-down.png`           | Vertical scrollbar down button, 17x17           |
| `scroll-left.png`           | Horizontal scrollbar left button, 17x17         |
| `scroll-right.png`          | Horizontal scrollbar right button, 17x17        |
| `scroll-track-v.png`        | Vertical track slice, 17x1, repeat-y            |
| `scroll-track-h.png`        | Horizontal track slice, 1x17, repeat-x          |
| `scroll-thumb-v-top.png`    | Vertical thumb top cap, 17x6                    |
| `scroll-thumb-v-mid.png`    | Vertical thumb body slice, 17x1, repeat-y       |
| `scroll-thumb-v-bottom.png` | Vertical thumb bottom cap, 17x6                 |
| `scroll-thumb-v-grip.png`   | Vertical thumb grip ridges, 7x8, centered       |
| `scroll-thumb-h-left.png`   | Horizontal thumb left cap, 6x17                 |
| `scroll-thumb-h-mid.png`    | Horizontal thumb body slice, 1x17, repeat-x     |
| `scroll-thumb-h-right.png`  | Horizontal thumb right cap, 6x17                |
| `scroll-thumb-h-grip.png`   | Horizontal thumb grip ridges, 8x7, centered     |

Still wanted (optional): hover/pressed state bitmaps for buttons and thumbs
(`scroll-*-hover.png` / `scroll-*-pressed.png`, from `luna.msstyles`); until
dropped in, hover/pressed are approximated with translucent tint overlays.

## Cursors (`cursors/`, REAL .cur files)

Registered by `src/xpArt.js` as `cursors/<name>` and wired at the desktop
Container root in `src/WinXP/index.jsx`. All are authentic Microsoft cursor
files (byte-identical across independent archive.org preservations of the XP
`C:\WINDOWS\Cursors` folder and rw-designer's extraction set).

| File name          | XP role                                   | Original file                    |
| ------------------ | ----------------------------------------- | -------------------------------- |
| `arrow.cur`        | Normal Select (white arrow)               | `arrow_m.cur` (Windows Standard) |
| `hand.cur`         | Link Select (white glove hand)            | classic `IDC_HAND` extraction    |
| `busy.cur`         | Busy (hourglass, static)                  | `busy_m.cur`                     |
| `appstarting.cur`  | Working in Background (arrow + hourglass) | `wait_m.cur`                     |

No `beam.cur` on purpose: every real XP Text Select cursor is an XOR-inverting
.cur that browsers decode as fully transparent. The native CSS `text` beam is
the same classic glyph, so text fields keep it.

Extract with Resource Hacker / IconsExtract from a real XP install or VM.
OOBE music: put `title.mp3` (converted from
`C:\WINDOWS\system32\oobe\images\title.wma`) into `public/music/` instead.
