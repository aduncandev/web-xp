// The user's side of the shop: eggs, the points balance, purchased titles,
// read news and the lifetime tallies, all in the profile hive. vfs
// re-renders on writes, so reading during render stays fresh.
import { useRef } from 'react';

export const POINTS_PER_EGG = 50;

export function useShopAccount(vfs, userName) {
  const vfsRef = useRef(vfs);
  vfsRef.current = vfs;

  const hive = (key, fallback) => {
    try {
      const v = vfs.getUserConfigFor(userName, key, fallback);
      return v == null ? fallback : v;
    } catch {
      return fallback;
    }
  };
  const list = key => {
    const v = hive(key, []);
    return Array.isArray(v) ? v : [];
  };
  const setHive = (key, value) => {
    try {
      vfsRef.current.setUserConfigFor(userName, key, value);
    } catch {
      // hive unavailable, nothing to persist onto
    }
  };

  const eggList = list('eggData');
  // The egg economy stays unspoken until this user has EVER found one
  // (lastEggTime survives trading the balance back to zero)
  const everFoundEgg = eggList.length > 0 || hive('lastEggTime', null) != null;
  const rawPoints = hive('xpPoints', 0);
  const points = Number.isFinite(rawPoints) && rawPoints > 0 ? rawPoints : 0;
  const ownedIds = list('xpOwned');
  // News items this user has opened; unread ones wear the NEW badge
  const readNews = list('shopNewsRead');
  const eggsTraded = hive('xpEggsTraded', 0) || 0;
  const pointsSpent = hive('xpSpent', 0) || 0;
  const downloadCount = hive('xpDownloads', 0) || 0;

  const tradeEggs = n => {
    const count = Math.min(n, eggList.length);
    if (count <= 0) return;
    setHive('eggData', eggList.slice(0, eggList.length - count));
    setHive('xpPoints', points + count * POINTS_PER_EGG);
    setHive('xpEggsTraded', eggsTraded + count);
  };
  const markNewsRead = id => {
    if (!readNews.includes(id)) setHive('shopNewsRead', [...readNews, id]);
  };
  /** Pay for a title; free ones leave no trace. */
  const purchase = app => {
    if (app.price <= 0) return;
    setHive('xpPoints', points - app.price);
    setHive('xpOwned', [...ownedIds, app.id]);
    setHive('xpSpent', pointsSpent + app.price);
  };
  const recordDownload = () => setHive('xpDownloads', downloadCount + 1);

  return {
    eggList,
    everFoundEgg,
    points,
    ownedIds,
    readNews,
    eggsTraded,
    pointsSpent,
    downloadCount,
    tradeEggs,
    markNewsRead,
    purchase,
    recordDownload,
  };
}
