// The shop's fixed tables: the three catalog shelves, the page size of a
// title list and the localStorage keys for the sound switches.
import {
  panelVc,
  panelVcOver,
  panelBlank,
  panelChannels,
  panelChannelsOver,
} from './art';

export const LS_SOUND = 'storeWiiSound';
export const LS_MUSIC = 'storeWiiMusic';

export const SHELVES = {
  games: { label: 'Games', panel: panelVc, over: panelVcOver },
  xpware: { label: 'XPWare', panel: panelBlank, logo: true },
  extras: { label: 'Extras', panel: panelChannels, over: panelChannelsOver },
};
export const SHELF_ORDER = ['games', 'xpware', 'extras'];
export const PER_PAGE = 10;
