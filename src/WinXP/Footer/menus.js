// The taskbar's right-click menus, as data for ContextMenu

// Marlett caption glyphs: 2 = restore, 0 = minimize, 1 = maximize, r = close
export function systemMenuItems(app) {
  const minimized = !!app.minimized;
  const maximized = !!app.maximized;
  const resizable = app.resizable !== false;
  return [
    {
      label: 'Restore',
      action: 'restore',
      glyph: '2',
      disabled: !minimized && !maximized,
      bold: minimized,
    },
    { label: 'Move', action: 'move', disabled: true },
    { label: 'Size', action: 'size', disabled: true },
    { label: 'Minimize', action: 'minimize', glyph: '0', disabled: minimized },
    {
      label: 'Maximize',
      action: 'maximize',
      glyph: '1',
      disabled: (maximized && !minimized) || !resizable,
    },
    { type: 'separator' },
    { label: 'Close', action: 'close', glyph: 'r', bold: !minimized },
  ];
}

export function taskbarMenuItems({ showQuickLaunch, taskbarLocked }) {
  return [
    {
      label: 'Toolbars',
      submenu: [
        { label: 'Address', action: 'toolbar-address', disabled: true },
        { label: 'Links', action: 'toolbar-links', disabled: true },
        { label: 'Language bar', action: 'toolbar-language', disabled: true },
        { label: 'Desktop', action: 'toolbar-desktop', disabled: true },
        {
          label: 'Quick Launch',
          action: 'toolbar-quick-launch',
          checked: showQuickLaunch,
        },
        { type: 'separator' },
        { label: 'New Toolbar...', action: 'toolbar-new', disabled: true },
      ],
    },
    { type: 'separator' },
    { label: 'Cascade Windows', action: 'cascade' },
    { label: 'Tile Windows Horizontally', action: 'tile-horizontally' },
    { label: 'Tile Windows Vertically', action: 'tile-vertically' },
    { label: 'Show the Desktop', action: 'show-desktop' },
    { type: 'separator' },
    { label: 'Task Manager', action: 'task-manager' },
    { type: 'separator' },
    {
      label: 'Lock the Taskbar',
      action: 'lock-taskbar',
      checked: taskbarLocked,
    },
    { label: 'Properties', action: 'properties' },
  ];
}
