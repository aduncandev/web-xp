// The static Explorer menus: only Favorites, Tools and Help are data.
// File, Edit and View are built from the window state in menus.js.

const Favorites = [
  {
    type: 'item',
    text: 'Add to Favorites...',
  },
  {
    type: 'item',
    text: 'Organize Favorites...',
  },
  {
    type: 'separator',
  },
  {
    type: 'menu',
    symbol: 'folder',
    position: {
      left: 'calc(100% - 4px)',
      top: '-3px',
    },
    text: 'Links',
    items: [
      {
        type: 'item',
        text: 'Customize Links',
        symbol: 'ie-paper',
      },
      {
        type: 'item',
        text: 'Free Hotmail',
        symbol: 'ie-paper',
      },
      {
        type: 'item',
        text: 'Windows',
        symbol: 'ie-paper',
      },
      {
        type: 'item',
        text: 'Windows Marketplace',
        symbol: 'ie-book',
      },
      {
        type: 'item',
        text: 'Windows Media',
        symbol: 'ie-paper',
      },
    ],
  },
  {
    type: 'item',
    text: 'MSN.com',
    symbol: 'ie-paper',
  },
  {
    type: 'item',
    text: 'Radio Station Guide',
    symbol: 'ie-paper',
  },
];
const Tools = [
  {
    type: 'item',
    text: 'Map Network Drive...',
  },
  {
    type: 'item',
    text: 'Disconnect Network Drive...',
  },
  {
    type: 'item',
    text: 'Synchronize...',
  },
  {
    type: 'separator',
  },
  {
    type: 'item',
    text: 'Folder Options...',
  },
];
const Help = [
  {
    type: 'item',
    text: 'Help and Support Center',
  },
  {
    type: 'separator',
  },
  {
    type: 'item',
    text: 'Is this copy of Windows legal?',
  },
  {
    type: 'item',
    text: 'About Windows',
  },
];

export default { Favorites, Tools, Help };
