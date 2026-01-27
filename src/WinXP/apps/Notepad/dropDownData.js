const File = [
  {
    type: 'item',
    text: 'New',
  },
  {
    type: 'item',
    text: 'Open...',
  },
  {
    type: 'item',
    text: 'Save',
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
    text: 'Undo...',
  },
  {
    type: 'separator',
  },
  {
    type: 'item',
    disable: true,
    text: 'Cut',
  },
  {
    type: 'item',
    disable: true,
    text: 'Copy',
  },
  {
    type: 'item',
    disable: true,
    text: 'Paste',
  },
  {
    type: 'item',
    disable: true,
    text: 'Delete',
  },
  {
    type: 'separator',
  },
  {
    type: 'item',
    disable: true,
    text: 'Find...',
  },
  {
    type: 'item',
    disable: true,
    text: 'Find Next',
  },
  {
    type: 'item',
    disable: true,
    text: 'Replace...',
  },
  {
    type: 'item',
    disable: true,
    text: 'Go To...',
  },
  {
    type: 'separator',
  },
  {
    type: 'item',
    disable: true, // You can enable this later if you want
    text: 'Select All',
  },
  {
    type: 'item',
    text: 'Time/Date',
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
