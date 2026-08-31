const File = [
  { type: 'item', text: 'Open Folder...' },
  { type: 'item', text: 'Refresh' },
  { type: 'separator' },
  { type: 'item', text: 'Save Tags' },
  { type: 'separator' },
  { type: 'item', text: 'Exit' },
];

const Edit = [
  { type: 'item', text: 'Select All' },
  { type: 'item', text: 'Invert Selection' },
  { type: 'separator' },
  { type: 'item', text: 'Undo Last Rename' },
];

const Convert = [
  { type: 'item', text: 'Tag to Filename...' },
  { type: 'item', text: 'Filename to Tag...' },
  { type: 'separator' },
  { type: 'item', text: 'Organize into Folders...' },
];

const Tools = [
  { type: 'item', text: 'Guess Tags from Filenames...' },
  { type: 'item', text: 'Auto-number Tracks' },
  { type: 'item', text: 'Set Cover Art...' },
];

const Help = [{ type: 'item', text: 'About Media Tag Editor' }];

export default { File, Edit, Convert, Tools, Help };
