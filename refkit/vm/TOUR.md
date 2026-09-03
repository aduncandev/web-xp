# Stock app tour: real XP SP3 (VM, 1024x768, Luna) against webXP

## Notepad
- Window: real opens 764x525 (registry default); ours 660x500. Text area: real has no inner border, both scrollbars (disabled while empty) and a size grip; ours draws a blue 1px border, arrows always enabled, no grip.
- Menus: real shows accelerators (Ctrl+N/O/S/P, Ctrl+Z/X/C/V, Del, Ctrl+F, F3, Ctrl+H, Ctrl+G, Ctrl+A, F5); ours had none (fixed). Real Replace and Go To are enabled; ours disabled (not implemented). Real Font... opens the common Font dialog (Font, Font style, Size lists, Sample, Script); ours has none. Help Topics real enabled.
## Paint
- Window: VM opened 265x405 at 0,0 (its saved placement); ours 660x520. Layout, tool box, colour box, status bar match.
- Menus: File lacks the disabled "Recent File" group; Print Preview/Page Setup/Print/Send real enabled. Edit "Repeat" is Ctrl+Y (fixed). View "Text Toolbar" real checked-disabled; "View Bitmap Ctrl+F" real enabled, ours disabled. Image and Colors match.
- Attributes: real is a compact dialog: Width/Height inline, Units and Colors groups with horizontal radios (Inches/Cm/Pixels, Black and white/Colors), OK/Cancel/Default on the right, resolution "81 x 81 dots per inch". Ours stacks the radios vertically with Inches/Cm disabled.
## Calculator
- Window and button grid match; ours 260x260 vs real ~253x255.
## WordPad
- Window: real 746x513, toolbar has Print/Print Preview/Find and Date/Time; ours 620x460 with a shorter toolbar and different icon art. Real status bar has a CAP pane.
- Calculator: View > Scientific does nothing in ours; the real switches to the scientific layout (Hex/Dec/Oct/Bin, Degrees/Radians/Grads, Inv/Hyp, Sta/Ave/Sum/s/Dat, F-E, dms, sin/cos/tan, x^y, x^3, x^2, n!, log, ln, Exp, Mod/And/Or/Xor/Lsh/Not/Int, pi, A-F). Menus match otherwise.
- WordPad: File menu real: "New..." with ellipsis, Print/Print Preview/Page Setup enabled, a disabled "Recent File", "Send...". View > Options... real enabled. Toolbar icons are XP's 16-colour set; ours are redrawn.
## Minesweeper
- Window, counters, field and the Game and Help menus match (F2, Beginner/Intermediate/Expert/Custom, Marks, Color, Sound, Best Times, Exit).
## Solitaire
- Real 580x420; ours 585x446. Real cards are cards.dll's 71x96 bitmaps (extracted to refkit-able res/cards: 52 faces plus backs); ours are redrawn with a different index style. Real default back is a picture deck; foundations are dotted outlines. Real status bar is one line "Score: 0 Time: 0" right-aligned; ours has two panes. Game menu: real Undo has no accelerator (ours showed Ctrl+Z, fixed).
## Command Prompt
- Real 648x318 (80x25 of the 8x12 raster font) with a vertical scrollbar and the title "C:\WINDOWS\system32\CMD.exe"; ours 680x380, a larger font, no scrollbar.
## Task Manager
- Real 383x438; menus File, Options, View, Windows, Shut Down, Help; View has Select Columns...; File > New Task enabled. Ours 403x434 with File, Options, View, Help only and New Task disabled. Applications list, buttons and status bar match. The real shows a CPU meter in the tray while open.
## Pinball
- Real: a 590x455 window with Game, Options and Help menus around the table and score panel. Ours opens with a black loading screen and no menu bar.
## Volume Control
- The VM has no sound device, so the real mixer could not be captured.
- Task Manager (menus): real Options is Always On Top, Minimize On Use, Hide When Minimized (plus Show Full Account Name on Users); View ends with Large Icons/Small Icons/Details on Applications and Select Columns... elsewhere; Windows and Shut Down menus exist. Ours now carries all of them; Shut Down items run through the shell's power flow and New Task opens the Run box.
- WordPad (menus): real Edit is Undo | Cut, Copy, Paste, Paste Special..., Clear (Del), Select All | Find..., Find Next (F3), Replace... | Links..., Object Properties (Alt+Enter), Object. Ours matched to that order, the unimplemented ones disabled. Format and Insert match; real Paragraph.../Tabs.../Object... are enabled.
- Solitaire: the drawn cards and CSS deck backs stay by choice; cards.dll's bitmaps were tried and dropped.

## Property sheets
- Taskbar and Start Menu Properties (`taskbarprops-taskbar.png`, `taskbarprops-startmenu.png`): 404x455 at (0,279). Tab pane at dialog (9,56) 386x360; groups at (22,74) and (22,249), 360 wide; previews 336x35 at (34,88) and (34,264); checkboxes at x 33, rows 132/153/174/196/217, 308, 369; Customize at (296,369); OK/Cancel/Apply at y 423, x 159/240/321. The preview bitmaps are explorer.exe 146-153 and 180-183 with the Media Player icon painted over; every state was captured and cropped into src/assets/xp/taskbarprops.
- Folder Options (`folderoptions-*.png`): 386x475. Groups at (24,75) 339x54, (24,147) 339x56, (24,220) 339x92; pictures 32x28 at (34,89) and (34,162), the click picture 25x30 at (37,234); radios at x 75 (sub-options x 93), rows 88/106, 161/179, 235/253/271/289; Restore Defaults at (256,326) 106x21; buttons at y 443, x 141/222/303. The Offline Files tab is text plus a 32px icon at (24,69).
- Both sheets, and Display Properties, now sit on the same rows and columns as the VM (checked line by line: tab pane, group boxes, tab strip, button outlines).
