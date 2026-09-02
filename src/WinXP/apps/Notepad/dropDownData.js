const File = [
  {
    type: 'item',
    text: 'New',
    hotkey: 'Ctrl+N',
  },
  {
    type: 'item',
    text: 'Open...',
    hotkey: 'Ctrl+O',
  },
  {
    type: 'item',
    text: 'Save',
    hotkey: 'Ctrl+S',
  },
  {
    type: 'item',
    text: 'Save As...',
  },
  {
    type: 'separator',
  },
  {
    type: 'item',
    disable: true, // Printing is hard in web, keeping disabled
    text: 'Page Setup...',
  },
  {
    type: 'item',
    disable: true,
    text: 'Print...',
    hotkey: 'Ctrl+P',
  },
  {
    type: 'separator',
  },
  {
    type: 'item',
    text: 'Exit',
  },
];

const Edit = [
  {
    type: 'item',
    disable: true,
    text: 'Undo',
    hotkey: 'Ctrl+Z',
  },
  {
    type: 'separator',
  },
  {
    type: 'item',
    disable: true,
    text: 'Cut',
    hotkey: 'Ctrl+X',
  },
  {
    type: 'item',
    disable: true,
    text: 'Copy',
    hotkey: 'Ctrl+C',
  },
  {
    type: 'item',
    disable: true,
    text: 'Paste',
    hotkey: 'Ctrl+V',
  },
  {
    type: 'item',
    disable: true,
    text: 'Delete',
    hotkey: 'Del',
  },
  {
    type: 'separator',
  },
  {
    type: 'item',
    disable: true,
    text: 'Find...',
    hotkey: 'Ctrl+F',
  },
  {
    type: 'item',
    disable: true,
    text: 'Find Next',
    hotkey: 'F3',
  },
  {
    type: 'item',
    disable: true,
    text: 'Replace...',
    hotkey: 'Ctrl+H',
  },
  {
    type: 'item',
    disable: true,
    text: 'Go To...',
    hotkey: 'Ctrl+G',
  },
  {
    type: 'separator',
  },
  {
    type: 'item',
    text: 'Select All',
    hotkey: 'Ctrl+A',
  },
  {
    type: 'item',
    text: 'Time/Date',
    hotkey: 'F5',
  },
];

const Format = [
  {
    type: 'item',
    text: 'Word Wrap',
  },
  {
    type: 'item',
    disable: true,
    text: 'Font...',
  },
];

const View = [
  {
    type: 'item',
    text: 'Status Bar',
  },
];

const Help = [
  {
    type: 'item',
    disable: true,
    text: 'Help Topics',
  },
  {
    type: 'item',
    text: 'About Notepad',
  },
];

export default { File, Edit, Format, View, Help };
