// Paint's menu bar, as WindowDropDowns data. Entries that XP had but this
// Paint does not are present and greyed, so the menus read like the real
// ones.

const SUB = { left: 'calc(100% - 4px)', top: '-3px' };

export function buildPaintMenus({
  currentPath,
  stackLen,
  hasSelection,
  hasClipboard,
  showToolBox,
  showColorBox,
  showStatusBar,
  transparentSelect,
}) {
  return {
    File: [
      { type: 'item', text: 'New', hotkey: 'Ctrl+N' },
      { type: 'item', text: 'Open...', hotkey: 'Ctrl+O' },
      { type: 'item', text: 'Save', hotkey: 'Ctrl+S' },
      { type: 'item', text: 'Save As...' },
      { type: 'separator' },
      { type: 'item', text: 'From Scanner or Camera...', disable: true },
      { type: 'separator' },
      { type: 'item', text: 'Print Preview', disable: true },
      { type: 'item', text: 'Page Setup...', disable: true },
      { type: 'item', text: 'Print...', hotkey: 'Ctrl+P', disable: true },
      { type: 'separator' },
      { type: 'item', text: 'Send...', disable: true },
      { type: 'separator' },
      {
        type: 'item',
        text: 'Set As Background (Tiled)',
        disable: !currentPath,
      },
      {
        type: 'item',
        text: 'Set As Background (Centered)',
        disable: !currentPath,
      },
      { type: 'separator' },
      { type: 'item', text: 'Recent File', disable: true },
      { type: 'separator' },
      { type: 'item', text: 'Exit', hotkey: 'Alt+F4' },
    ],
    Edit: [
      {
        type: 'item',
        text: 'Undo',
        hotkey: 'Ctrl+Z',
        disable: stackLen.u === 0,
      },
      {
        type: 'item',
        text: 'Repeat',
        hotkey: 'Ctrl+Y',
        disable: stackLen.r === 0,
      },
      { type: 'separator' },
      { type: 'item', text: 'Cut', hotkey: 'Ctrl+X', disable: !hasSelection },
      { type: 'item', text: 'Copy', hotkey: 'Ctrl+C', disable: !hasSelection },
      { type: 'item', text: 'Paste', hotkey: 'Ctrl+V', disable: !hasClipboard },
      {
        type: 'item',
        text: 'Clear Selection',
        hotkey: 'Del',
        disable: !hasSelection,
      },
      { type: 'item', text: 'Select All', hotkey: 'Ctrl+A' },
      { type: 'separator' },
      { type: 'item', text: 'Copy To...', disable: true },
      { type: 'item', text: 'Paste From...', disable: true },
    ],
    View: [
      {
        type: 'item',
        text: 'Tool Box',
        hotkey: 'Ctrl+T',
        symbol: showToolBox ? 'check' : undefined,
      },
      {
        type: 'item',
        text: 'Color Box',
        hotkey: 'Ctrl+L',
        symbol: showColorBox ? 'check' : undefined,
      },
      {
        type: 'item',
        text: 'Status Bar',
        symbol: showStatusBar ? 'check' : undefined,
      },
      { type: 'item', text: 'Text Toolbar', disable: true },
      { type: 'separator' },
      {
        type: 'menu',
        text: 'Zoom',
        position: SUB,
        items: [
          { type: 'item', text: 'Normal Size', hotkey: 'Ctrl+PgUp' },
          { type: 'item', text: 'Large Size', hotkey: 'Ctrl+PgDn' },
          { type: 'item', text: 'Custom...', disable: true },
          { type: 'separator' },
          { type: 'item', text: 'Show Grid', hotkey: 'Ctrl+G', disable: true },
          { type: 'item', text: 'Show Thumbnail', disable: true },
        ],
      },
      { type: 'item', text: 'View Bitmap', hotkey: 'Ctrl+F', disable: true },
    ],
    Image: [
      { type: 'item', text: 'Flip/Rotate...', hotkey: 'Ctrl+R' },
      { type: 'item', text: 'Stretch/Skew...', hotkey: 'Ctrl+W' },
      { type: 'item', text: 'Invert Colors', hotkey: 'Ctrl+I' },
      { type: 'item', text: 'Attributes...', hotkey: 'Ctrl+E' },
      { type: 'item', text: 'Clear Image', hotkey: 'Ctrl+Shft+N' },
      {
        type: 'item',
        text: 'Draw Opaque',
        symbol: !transparentSelect ? 'check' : undefined,
      },
    ],
    Colors: [{ type: 'item', text: 'Edit Colors...' }],
    Help: [
      { type: 'item', text: 'Help Topics', disable: true },
      { type: 'separator' },
      { type: 'item', text: 'About Paint' },
    ],
  };
}
