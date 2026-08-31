// Dynamic Explorer menu bar data
import dropDownData from './dropDownData';

// File-type/display-name knowledge lives in the shell-wide registry now;
// re-exported here so this module's API is unchanged.
export {
  hiddenExtension,
  shellDisplayName,
  displayName,
  getTypeLabel,
} from '../fileTypes';

const SUB = { left: 'calc(100% - 4px)', top: '-3px' };

export const VIEW_MODES = [
  { key: 'thumbnails', label: 'Thumbnails' },
  { key: 'tiles', label: 'Tiles' },
  { key: 'icons', label: 'Icons' },
  { key: 'list', label: 'List' },
  { key: 'details', label: 'Details' },
];

export const SORT_KEYS = [
  { key: 'name', label: 'Name' },
  { key: 'size', label: 'Size' },
  { key: 'type', label: 'Type' },
  { key: 'modified', label: 'Modified' },
];

/**
 * Build the Explorer menu-bar data for the current UI state.
 * WindowDropDowns dispatches by item text, so labels double as actions.
 */
export function buildExplorerMenus({
  viewMode,
  sortBy,
  canPaste,
  hasSelection,
  canModifySelection,
  statusBar,
  inFolder,
  // Control Panel has one fixed layout, so the Icons/Tiles/Details radios
  // grey out there while the rest of the View menu keeps working
  layoutLocked,
}) {
  const File = [
    {
      type: 'menu',
      text: 'New',
      position: SUB,
      items: [
        { type: 'item', text: 'Folder' },
        { type: 'item', text: 'Shortcut' },
        { type: 'separator' },
        { type: 'item', text: 'Text Document' },
      ],
      disable: !inFolder,
    },
    { type: 'separator' },
    { type: 'item', text: 'Create Shortcut', disable: !hasSelection },
    { type: 'item', text: 'Delete', disable: !canModifySelection },
    { type: 'item', text: 'Rename', disable: !canModifySelection },
    { type: 'item', text: 'Properties', disable: !hasSelection },
    { type: 'separator' },
    { type: 'item', text: 'Close' },
  ];

  const Edit = [
    { type: 'item', text: 'Undo', hotkey: 'Ctrl+Z', disable: true },
    { type: 'separator' },
    {
      type: 'item',
      text: 'Cut',
      hotkey: 'Ctrl+X',
      disable: !canModifySelection,
    },
    { type: 'item', text: 'Copy', hotkey: 'Ctrl+C', disable: !hasSelection },
    { type: 'item', text: 'Paste', hotkey: 'Ctrl+V', disable: !canPaste },
    { type: 'separator' },
    { type: 'item', text: 'Select All', hotkey: 'Ctrl+A', disable: !inFolder },
    { type: 'item', text: 'Invert Selection', disable: !inFolder },
  ];

  const View = [
    { type: 'item', text: 'Toolbars', disable: true },
    {
      type: 'item',
      text: 'Status Bar',
      symbol: statusBar ? 'check' : undefined,
    },
    { type: 'item', text: 'Explorer Bar', disable: true },
    { type: 'separator' },
    ...VIEW_MODES.map(v => ({
      disable: !!layoutLocked,
      type: 'item',
      text: v.label,
      symbol: viewMode === v.key ? 'circle' : undefined,
    })),
    { type: 'separator' },
    {
      type: 'menu',
      text: 'Arrange Icons by',
      position: SUB,
      items: SORT_KEYS.map(s => ({
        type: 'item',
        text: s.label,
        symbol: sortBy === s.key ? 'circle' : undefined,
      })),
    },
    { type: 'separator' },
    {
      type: 'menu',
      text: 'Go To',
      position: SUB,
      items: [
        { type: 'item', text: 'Back' },
        { type: 'item', text: 'Forward' },
        { type: 'item', text: 'Up One Level' },
        { type: 'separator' },
        { type: 'item', text: 'My Computer' },
      ],
    },
    { type: 'item', text: 'Refresh' },
  ];

  return {
    File,
    Edit,
    View,
    Favorites: dropDownData.Favorites,
    Tools: dropDownData.Tools,
    Help: dropDownData.Help,
  };
}
