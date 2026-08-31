// WordPad menu bar — built per-render so View toggles show live checkmarks.

export default function buildMenus({ toolbar, formatBar, ruler, statusBar }) {
  return {
    File: [
      { type: 'item', text: 'New', hotkey: 'Ctrl+N' },
      { type: 'item', text: 'Open...', hotkey: 'Ctrl+O' },
      { type: 'item', text: 'Save', hotkey: 'Ctrl+S' },
      { type: 'item', text: 'Save As...' },
      { type: 'separator' },
      { type: 'item', text: 'Print...', disable: true, hotkey: 'Ctrl+P' },
      { type: 'item', text: 'Print Preview', disable: true },
      { type: 'item', text: 'Page Setup...', disable: true },
      { type: 'separator' },
      { type: 'item', text: 'Exit' },
    ],
    Edit: [
      { type: 'item', text: 'Undo', hotkey: 'Ctrl+Z' },
      { type: 'separator' },
      { type: 'item', text: 'Cut', hotkey: 'Ctrl+X' },
      { type: 'item', text: 'Copy', hotkey: 'Ctrl+C' },
      { type: 'item', text: 'Paste', hotkey: 'Ctrl+V' },
      { type: 'separator' },
      { type: 'item', text: 'Select All', hotkey: 'Ctrl+A' },
      { type: 'separator' },
      { type: 'item', text: 'Find...', disable: true, hotkey: 'Ctrl+F' },
      { type: 'item', text: 'Replace...', disable: true, hotkey: 'Ctrl+H' },
    ],
    View: [
      { type: 'item', text: 'Toolbar', symbol: toolbar ? 'check' : undefined },
      {
        type: 'item',
        text: 'Format Bar',
        symbol: formatBar ? 'check' : undefined,
      },
      { type: 'item', text: 'Ruler', symbol: ruler ? 'check' : undefined },
      {
        type: 'item',
        text: 'Status Bar',
        symbol: statusBar ? 'check' : undefined,
      },
      { type: 'separator' },
      { type: 'item', text: 'Options...', disable: true },
    ],
    Insert: [
      { type: 'item', text: 'Date and Time...' },
      { type: 'item', text: 'Object...', disable: true },
    ],
    Format: [
      { type: 'item', text: 'Font...' },
      { type: 'item', text: 'Bullet Style' },
      { type: 'item', text: 'Paragraph...', disable: true },
      { type: 'item', text: 'Tabs...', disable: true },
    ],
    Help: [
      { type: 'item', text: 'Help Topics', disable: true },
      { type: 'item', text: 'About WordPad' },
    ],
  };
}
