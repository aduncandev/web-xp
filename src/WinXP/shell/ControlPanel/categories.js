import {
  AppearanceIcon,
  NetworkIcon,
  AddRemoveIcon,
  SoundsIcon,
  PerformanceIcon,
  PrintersIcon,
  UserAccountsIcon,
  DateTimeIcon,
  AccessibilityIcon,
  SecurityIcon,
  FolderOptionsIcon,
  SystemIcon,
} from './icons';
import { EXE_PATHS } from '../../../context/vfsConstants';

export const DESK_CPL = EXE_PATHS.DESK_CPL;
export const SYSDM_CPL = EXE_PATHS.SYSDM_CPL;

export const CATEGORIES = [
  {
    key: 'appearance',
    label: 'Appearance and Themes',
    Icon: AppearanceIcon,
    tasks: [
      'Change the computer\u2019s theme',
      'Change the desktop background',
      'Choose a screen saver',
      'Change the screen resolution',
    ],
  },
  {
    key: 'network',
    label: 'Network and Internet Connections',
    Icon: NetworkIcon,
    tasks: [
      'Set up or change your Internet connection',
      'Create a connection to the network at your workplace',
      'Set up or change your home or small office network',
    ],
  },
  {
    key: 'addremove',
    label: 'Add or Remove Programs',
    Icon: AddRemoveIcon,
    tasks: [
      'Change or remove programs',
      'Add new programs',
      'Add/Remove Windows components',
    ],
  },
  {
    key: 'sounds',
    label: 'Sounds, Speech, and Audio Devices',
    Icon: SoundsIcon,
    tasks: [
      'Adjust the system volume',
      'Change the sound scheme',
      'Change the speaker settings',
    ],
  },
  {
    key: 'performance',
    label: 'Performance and Maintenance',
    Icon: PerformanceIcon,
    tasks: [
      'See basic information about your computer',
      'Free up space on your hard disk',
      'Back up your data',
      'Rearrange items on your hard disk to make programs run faster',
    ],
    taskActions: {
      'See basic information about your computer': SYSDM_CPL,
    },
  },
  {
    key: 'printers',
    label: 'Printers and Other Hardware',
    Icon: PrintersIcon,
    tasks: ['View installed printers or fax printers', 'Add a printer'],
  },
  {
    key: 'users',
    label: 'User Accounts',
    Icon: UserAccountsIcon,
    tasks: [],
  },
  {
    key: 'datetime',
    label: 'Date, Time, Language, and Regional Options',
    Icon: DateTimeIcon,
    tasks: [],
  },
  {
    key: 'accessibility',
    label: 'Accessibility Options',
    Icon: AccessibilityIcon,
    tasks: [
      'Adjust the contrast for text and colors on your screen',
      'Configure Windows to work for your vision, hearing, and mobility needs',
    ],
  },
  {
    key: 'security',
    label: 'Security Center',
    Icon: SecurityIcon,
    tasks: [
      'Check the security status of this computer',
      'Change the way Security Center alerts me',
    ],
  },
];

export const CLASSIC_APPLETS = [
  { label: 'Accessibility Options', Icon: AccessibilityIcon },
  { label: 'Add or Remove Programs', Icon: AddRemoveIcon },
  { label: 'Date and Time', Icon: DateTimeIcon, view: 'datetime' },
  { label: 'Display', Icon: AppearanceIcon, open: DESK_CPL },
  {
    label: 'Folder Options',
    Icon: FolderOptionsIcon,
    dialog: 'folder-options',
  },
  { label: 'Network Connections', Icon: NetworkIcon },
  { label: 'Printers and Faxes', Icon: PrintersIcon },
  { label: 'Security Center', Icon: SecurityIcon },
  { label: 'Sounds and Audio Devices', Icon: SoundsIcon },
  { label: 'System', Icon: SystemIcon, open: SYSDM_CPL },
  { label: 'User Accounts', Icon: UserAccountsIcon, view: 'ua-home' },
];

// Every page Control Panel can show, as the view ids Explorer carries in its
// path ('Control Panel/<view>'). The category pages are 'cat:<key>'.
const FIXED_VIEWS = {
  home: 'Control Panel',
  classic: 'Control Panel',
  datetime: 'Date and Time',
  'ua-home': 'User Accounts',
  'ua-create': 'User Accounts',
  'ua-change': 'User Accounts',
  'ua-password': 'User Accounts',
  'ua-logon': 'User Accounts',
};

/** Whether `view` names a page Control Panel can show. */
export function isControlPanelView(view) {
  if (FIXED_VIEWS[view]) return true;
  return (
    typeof view === 'string' &&
    view.startsWith('cat:') &&
    CATEGORIES.some(c => c.key === view.slice(4))
  );
}

/** The page's own title, for history menus; null for an unknown view. */
export function controlPanelViewTitle(view) {
  if (FIXED_VIEWS[view]) return FIXED_VIEWS[view];
  const cat =
    typeof view === 'string' && view.startsWith('cat:')
      ? CATEGORIES.find(c => c.key === view.slice(4))
      : null;
  return cat ? cat.label : null;
}
