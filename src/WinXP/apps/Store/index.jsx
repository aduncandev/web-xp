/*
 * XP Shop, a recreation of the Wii Shop Channel built from the channel's
 * own preserved assets and stylesheet (oss.css). The site's optional apps
 * stand in for the catalog; downloads install real programs onto the XP
 * desktop and deleting removes them again, so the base install stays lean.
 *
 * This file holds the parts together: the account hook (eggs, points and
 * purchases in the profile hive), the audio hook (cues and the two-part
 * music), the navigation stack, the scaled 608x456 stage, and the screen
 * table in screens/. Each screen receives the same `shop` bag.
 */
import { useEffect, useRef, useState } from 'react';

import { useVFS } from '../../../context/VFSContext';
import { useVolume } from '../../../context/VolumeContext';
import { getCurrentUserName } from '../../../context/users';
import { WELCOME_GROUPS, repairShopState } from './catalog';
import { liveCatalog } from './catalogView';
import { useShopAccount } from './useShopAccount';
import { useShopAudio } from './useShopAudio';
import { useShopNav } from './useShopNav';
import { useScaledStage } from './useScaledStage';
import { SCREENS } from './screens';
import { Shell } from './styles';

const SPLASH_MS = 2100;
const WELCOME_TURN_MS = 8000;

export default function Store({ onClose, onShellOpen }) {
  const vfs = useVFS();
  const { effectiveVolume } = useVolume();
  // Owner captured at mount, like the Egg app: a window surviving a
  // fast-user-switch keeps trading ITS user's eggs
  const userRef = useRef(getCurrentUserName());
  const userName = userRef.current;

  const nav = useShopNav();
  const { cur } = nav;
  const account = useShopAccount(vfs, userName);
  const audio = useShopAudio(effectiveVolume, cur.screen);
  const { shellRef, scale } = useScaledStage();

  // Page memory that outlives the page: the welcome shelf's group, the
  // Important Info page, the hovered catalog panel, the photo well's index
  const [featured, setFeatured] = useState(0);
  const [newsPage, setNewsPage] = useState(0);
  const [hoverShelf, setHoverShelf] = useState(null);
  const [previewIdx, setPreviewIdx] = useState(0);
  useEffect(() => {
    if (cur.screen !== 'main') setHoverShelf(null);
  }, [cur.screen]);

  const apps = liveCatalog(vfs, userName, account.ownedIds);
  const byId = id => apps.find(a => a.id === id);
  const installedApps = apps.filter(a => a.installed);

  // Repair pass: bare exes, old shortcut names and stray Start menu entries
  // from profiles predating the current shop layout
  useEffect(() => {
    try {
      repairShopState(vfs, userName);
    } catch {
      // hive unavailable
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The welcome shelf pages itself through the groups
  useEffect(() => {
    if (cur.screen !== 'welcome') return undefined;
    const t = setInterval(
      () => setFeatured(f => (f + 1) % WELCOME_GROUPS.length),
      WELCOME_TURN_MS,
    );
    return () => clearInterval(t);
  }, [cur.screen]);

  // Splash: the music starts, the ring whirls for a beat, then the shop
  useEffect(() => {
    if (cur.screen !== 'splash') return undefined;
    const stopLoad = audio.beginSplash();
    const t = setTimeout(() => {
      stopLoad();
      nav.reset('welcome');
    }, SPLASH_MS);
    return () => {
      clearTimeout(t);
      stopLoad();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur.screen]);

  const shop = {
    cur,
    nav: {
      ...nav,
      goBack: () => {
        audio.sfx('cancel');
        nav.goBack();
      },
    },
    apps,
    byId,
    installedApps,
    account,
    audio,
    effectiveVolume,
    vfs,
    userName,
    onClose,
    onShellOpen,
    ui: {
      featured,
      setFeatured,
      newsPage,
      setNewsPage,
      hoverShelf,
      setHoverShelf,
      previewIdx,
      setPreviewIdx,
    },
  };
  const Screen = SCREENS[cur.screen];

  return (
    <Shell ref={shellRef}>
      <div
        className="cvs"
        style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {Screen && <Screen shop={shop} />}
      </div>
    </Shell>
  );
}
