/*
 * Store — add or remove the non-stock apps so the base install stays lean.
 *
 * A recreation of the Wii Shop Channel built from the channel's own
 * preserved assets and stylesheet (oss.css): the click-the-ring splash, the
 * two-part shop music, the Welcome page with its featured-title carousel
 * and Important Info panel, the Main Menu's three catalog panels, title
 * pages laid out to B_05.css, the Mario coin-collecting download animation
 * with the real SMB sound bites, and the glossy footer buttons. The site's
 * apps stand in for the catalog: everything is free, balances sit at
 * 0 Wii Points, and downloads install real programs onto the XP desktop.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { useVFS } from '../../../context/VFSContext';
import { useVolume } from '../../../context/VolumeContext';
import { getCurrentUserName } from '../../../context/users';
import eggImg from 'assets/windowsIcons/egg.png';
import {
  CATALOG,
  isInstalled,
  installApp,
  uninstallApp,
  priceOf,
  fmtSize,
  repairShopState,
  mediaFilePaths,
  mediaDestLabel,
  mediaFileUrls,
  mediaPackDir,
  SHOP_NEWS,
  WELCOME_GROUPS,
  SHELF_INFO,
  SHELF_SEARCH,
} from './catalog';
import { playUi, startLoadLoop, createMusic } from './sfx';
import { Shell, CANVAS_W, CANVAS_H } from './styles';
import MarioDownload from './MarioDownload';
import Keyboard from './Keyboard';
import {
  welcomeBg,
  panelVc,
  panelVcOver,
  panelBlank,
  panelChannels,
  panelChannelsOver,
  plateL,
  plateR,
  newBadge,
  arrowL,
  arrowR,
  arrowL1,
  arrowL2,
  arrowL3,
  arrowL4,
  arrowLS,
  arrowR1,
  arrowR2,
  arrowR3,
  arrowR4,
  arrowRS,
  ringImg,
  ringShadowImg,
} from './art';

const LS_SOUND = 'storeWiiSound';
const LS_MUSIC = 'storeWiiMusic';

const SHELVES = {
  games: { label: 'Games', panel: panelVc, over: panelVcOver },
  xpware: { label: 'XPWare', panel: panelBlank, logo: true },
  extras: { label: 'Extras', panel: panelChannels, over: panelChannelsOver },
};
const SHELF_ORDER = ['games', 'xpware', 'extras'];
const PER_PAGE = 10;

const loadFlag = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : v === '1';
  } catch {
    return fallback;
  }
};

// The welcome arrows' sprite and drift schedules, lifted from the page's
// own 79-tick animation loop; hover swaps in the _S face.
const ARROW_SPRITES = {
  l: [arrowL, arrowL1, arrowL2, arrowL3, arrowL4],
  r: [arrowR, arrowR1, arrowR2, arrowR3, arrowR4],
};
const ARROW_STOP = { l: arrowLS, r: arrowRS };
const SPRITE_AT = [
  [0, 0],
  [13, 1],
  [20, 2],
  [25, 3],
  [30, 4],
  [44, 3],
  [59, 2],
  [64, 1],
  [71, 0],
];
const DRIFT_AT = [
  [0, 0],
  [1, 1],
  [10, 2],
  [14, 3],
  [17, 4],
  [20, 5],
  [23, 6],
  [27, 7],
  [31, 8],
  [49, 7],
  [53, 6],
  [57, 5],
  [60, 4],
  [63, 3],
  [66, 2],
  [70, 1],
];
const stepOf = (table, t) => {
  let v = table[0][1];
  for (const [at, val] of table) if (t >= at) v = val;
  return v;
};

function WgArrows({ onPrev, onNext, hover }) {
  const [anim, setAnim] = useState({ sprite: 0, drift: 0 });
  const [held, setHeld] = useState(null);
  useEffect(() => {
    let t = 0;
    const id = setInterval(() => {
      t = (t + 1) % 79;
      const next = { sprite: stepOf(SPRITE_AT, t), drift: stepOf(DRIFT_AT, t) };
      setAnim(a =>
        a.sprite === next.sprite && a.drift === next.drift ? a : next,
      );
    }, 16);
    return () => clearInterval(id);
  }, []);
  const side = (key, left, onClick) => (
    <button
      className="wgarrow"
      style={{ left }}
      onMouseEnter={() => {
        setHeld(key);
        hover();
      }}
      onMouseLeave={() => setHeld(h => (h === key ? null : h))}
      onClick={onClick}
    >
      <img
        src={held === key ? ARROW_STOP[key] : ARROW_SPRITES[key][anim.sprite]}
        alt={key === 'l' ? '<' : '>'}
      />
    </button>
  );
  return (
    <>
      {side('l', 15 + anim.drift, onPrev)}
      {side('r', 537 - anim.drift, onNext)}
    </>
  );
}

export default function Store({ onClose, onShellOpen }) {
  const vfs = useVFS();
  const { effectiveVolume } = useVolume();

  const [stack, setStack] = useState([{ screen: 'splash' }]);
  const cur = stack[stack.length - 1];

  const [soundOn, setSoundOn] = useState(() => loadFlag(LS_SOUND, true));
  const [musicOn, setMusicOn] = useState(() => loadFlag(LS_MUSIC, true));
  const [featured, setFeatured] = useState(0);

  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;
  const volRef = useRef(effectiveVolume);
  volRef.current = effectiveVolume;
  const vfsRef = useRef(vfs);
  vfsRef.current = vfs;
  // Owner captured at mount, like the Egg app: a window surviving a
  // fast-user-switch keeps trading ITS user's eggs.
  const userRef = useRef(getCurrentUserName());

  // Eggs, the points balance and the list of purchased titles all live in
  // the user's profile hive; vfs re-renders on writes, so reading during
  // render stays fresh.
  const hive = (key, fallback) => {
    try {
      const v = vfs.getUserConfigFor(userRef.current, key, fallback);
      return v == null ? fallback : v;
    } catch {
      return fallback;
    }
  };
  const eggList = Array.isArray(hive('eggData', [])) ? hive('eggData', []) : [];
  // The egg economy stays unspoken until this user has EVER found one
  // (lastEggTime survives trading the balance back to zero).
  const everFoundEgg = eggList.length > 0 || hive('lastEggTime', null) != null;
  const rawPoints = hive('xpPoints', 0);
  const points = Number.isFinite(rawPoints) && rawPoints > 0 ? rawPoints : 0;
  const ownedIds = Array.isArray(hive('xpOwned', []))
    ? hive('xpOwned', [])
    : [];
  const setHive = (key, value) => {
    try {
      vfsRef.current.setUserConfigFor(userRef.current, key, value);
    } catch {
      /* hive unavailable — nothing to persist onto */
    }
  };
  // News items this user has opened; unread ones wear the NEW badge on
  // the welcome page, the way the channel's Important Info rows did
  const readNews = Array.isArray(hive('shopNewsRead', []))
    ? hive('shopNewsRead', [])
    : [];

  // Lifetime tallies for the Account Activity page
  const eggsTraded = hive('xpEggsTraded', 0) || 0;
  const pointsSpent = hive('xpSpent', 0) || 0;
  const downloadCount = hive('xpDownloads', 0) || 0;

  const tradeEggs = n => {
    const count = Math.min(n, eggList.length);
    if (count <= 0) return;
    setHive('eggData', eggList.slice(0, eggList.length - count));
    setHive('xpPoints', points + count * 50);
    setHive('xpEggsTraded', eggsTraded + count);
  };

  useEffect(() => {
    try {
      localStorage.setItem(LS_SOUND, soundOn ? '1' : '0');
      localStorage.setItem(LS_MUSIC, musicOn ? '1' : '0');
    } catch {
      /* private mode etc. */
    }
  }, [soundOn, musicOn]);

  const sfx = useCallback(kind => {
    if (soundRef.current) playUi(kind, volRef.current * 0.6);
  }, []);
  // the channel plays a soft blip on hover; keep it from machine-gunning
  const lastHover = useRef(0);
  const hover = useCallback(() => {
    const now = performance.now();
    if (now - lastHover.current > 70) {
      lastHover.current = now;
      if (soundRef.current) playUi('hover', volRef.current * 0.35);
    }
  }, []);

  // Picture packs page through their images in the title page's photo well
  const [previewIdx, setPreviewIdx] = useState(0);
  // which page of Important Info rows the welcome panel is showing
  const [newsPage, setNewsPage] = useState(0);
  // which catalog panel the pointer is on (drives the main menu's bubble)
  const [hoverShelf, setHoverShelf] = useState(null);
  useEffect(() => {
    if (cur.screen !== 'main') setHoverShelf(null);
  }, [cur.screen]);

  // ---- the two-part shop music ----
  const musicRef = useRef(null);
  if (!musicRef.current) musicRef.current = createMusic();
  useEffect(() => {
    musicRef.current.setVolume(
      (musicOn ? 1 : 0) *
        effectiveVolume *
        0.4 *
        (cur.screen === 'downloading' ? 0.45 : 1),
    );
  }, [musicOn, effectiveVolume, cur.screen]);
  useEffect(() => {
    const music = musicRef.current;
    return () => music.stop();
  }, []);

  // ---- catalog with live install state ----
  const apps = CATALOG.map(a => ({
    ...a,
    installed: isInstalled(vfs, a, userRef.current),
    // once a title is purchased it stays free to re-download
    owned: ownedIds.includes(a.id),
    price: ownedIds.includes(a.id) ? 0 : priceOf(a),
  }));
  const byId = id => apps.find(a => a.id === id);
  const installedApps = apps.filter(a => a.installed);

  const go = (screen, extra) => setStack(s => [...s, { screen, ...extra }]);
  const goBack = () => {
    sfx('cancel');
    setStack(s => (s.length > 1 ? s.slice(0, -1) : s));
  };
  const jumpToTitle = app =>
    setStack([
      { screen: 'main' },
      { screen: 'shelfhub', shelf: app.shelf },
      { screen: 'list', shelf: app.shelf, mode: 'all' },
      { screen: 'title', appId: app.id },
    ]);
  const priceLabel = app =>
    app.installed
      ? 'Downloaded'
      : app.owned
      ? 'Owned'
      : app.price === 0
      ? 'Free'
      : `${app.price} XP Points`;

  // ---- scale the 608x456 page to whatever the window gives us ----
  const shellRef = useRef(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = shellRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width && r.height)
        setScale(Math.min(r.width / CANVAS_W, r.height / CANVAS_H));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- repair pass: bare exes, old shortcut names and stray Start menu
  // entries from profiles predating the current shop layout ----
  useEffect(() => {
    try {
      repairShopState(vfsRef.current, userRef.current);
    } catch {
      /* hive unavailable */
    }
  }, []);

  // ---- the loading whirl also runs during the download animation ----
  useEffect(() => {
    if (cur.screen !== 'downloading') return;
    const stop = soundRef.current
      ? startLoadLoop(volRef.current * 0.45)
      : () => {};
    return stop;
  }, [cur.screen]);

  // ---- the welcome shelf pages itself through the groups ----
  useEffect(() => {
    if (cur.screen !== 'welcome') return;
    const t = setInterval(
      () => setFeatured(f => (f + 1) % WELCOME_GROUPS.length),
      8000,
    );
    return () => clearInterval(t);
  }, [cur.screen]);

  // ---- splash: a short loading beat, then straight into the shop ----
  useEffect(() => {
    if (cur.screen !== 'splash') return;
    musicRef.current.start((musicOn ? 1 : 0) * volRef.current * 0.4);
    const stopLoad = soundRef.current
      ? startLoadLoop(volRef.current * 0.7)
      : () => {};
    const t = setTimeout(() => {
      stopLoad();
      setStack([{ screen: 'welcome' }]);
    }, 2100);
    return () => {
      clearTimeout(t);
      stopLoad();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur.screen]);

  // ------------------------------------------------------------------
  // Shared fragments
  // ------------------------------------------------------------------

  const underBtn = (pos, label, onClick, opts = {}) => (
    <button
      className={`underbtn underbtn--${pos}`}
      onMouseEnter={hover}
      onClick={onClick}
      style={opts.style}
    >
      <span>{label}</span>
    </button>
  );

  const pointsBadge = (
    <div className="points">
      {points}
      <small>XP Points</small>
    </div>
  );

  const backFooter = (extraRight = null) => (
    <>
      <div className="dots dots--bottom" />
      {underBtn('l', 'Back', goBack)}
      {pointsBadge}
      {extraRight}
    </>
  );

  const pageNo = cur.page || 0;
  const setPage = n => setStack(s => [...s.slice(0, -1), { ...cur, page: n }]);

  const pagedList = (items, emptyText, showSize = false) => {
    const slice = items.slice(pageNo * PER_PAGE, pageNo * PER_PAGE + PER_PAGE);
    return (
      <div className="catalogFrame">
        {items.length === 0 && <div className="list__empty">{emptyText}</div>}
        {slice.map(app => (
          <button
            key={app.id}
            className="row"
            onMouseEnter={hover}
            onClick={() => {
              sfx('decide');
              go('title', { appId: app.id });
            }}
          >
            <span className="row__plate">
              <img src={app.icon} alt="" />
            </span>
            <span className="row__name">
              {app.name}
              {!showSize && app.isNew && (
                <img className="row__new" src={newBadge} alt="NEW" />
              )}
            </span>
            <span className="row__pub">{app.publisher}</span>
            <span className="row__cat">{app.category}</span>
            <span className="row__price">
              {showSize ? fmtSize(app.sizeBytes) : priceLabel(app)}
            </span>
          </button>
        ))}
      </div>
    );
  };

  const pager = (items, per = PER_PAGE) => {
    const pages = Math.max(1, Math.ceil(items.length / per));
    if (pages <= 1) return null;
    return (
      <>
        {pageNo > 0 && (
          <button
            className="pgarrow pgarrow--l"
            onMouseEnter={hover}
            onClick={() => {
              sfx('decide');
              setPage(pageNo - 1);
            }}
          />
        )}
        <div className="pgnum">
          {Math.min(pageNo, pages - 1) + 1}/{pages}
        </div>
        {pageNo < pages - 1 && (
          <button
            className="pgarrow pgarrow--r"
            onMouseEnter={hover}
            onClick={() => {
              sfx('decide');
              setPage(pageNo + 1);
            }}
          />
        )}
      </>
    );
  };

  // ------------------------------------------------------------------
  // The screens
  // ------------------------------------------------------------------

  let page = null;

  switch (cur.screen) {
    case 'splash': {
      page = (
        <>
          <div className="pgtitle">XP Shop</div>
          <div className="dots dots--top" />
          <div className="splashmsg">Connecting. Please wait...</div>
          <div className="ringwrap ringwrap--spin">
            <img className="shadow" src={ringShadowImg} alt="" />
            <img className="ring" src={ringImg} alt="" />
          </div>
          <div className="dots dots--bottom" />
        </>
      );
      break;
    }

    case 'welcome': {
      const group = WELCOME_GROUPS[featured % WELCOME_GROUPS.length];
      const cells = group.ids.map(byId).filter(Boolean);
      page = (
        <>
          <img className="bgart" src={welcomeBg} alt="" />
          <div className="wg__head">{group.heading}</div>
          {cells.map((app, i) => (
            <button
              key={app.id}
              className="wg__cell"
              style={{ left: i % 2 ? 309 : 27, top: i < 2 ? 73 : 154 }}
              onMouseEnter={hover}
              onClick={() => {
                sfx('decide');
                jumpToTitle(app);
              }}
            >
              {app.isNew && (
                <img className="wg__new" src={newBadge} alt="NEW" />
              )}
              <span className="wg__plate">
                <img className="wg__icon" src={app.icon} alt="" />
              </span>
              <span className="wg__txt">
                <span className="wg__name">{app.name}</span>
                <span>{priceLabel(app)}</span>
              </span>
            </button>
          ))}
          <WgArrows
            hover={hover}
            onPrev={() => {
              sfx('decide');
              setFeatured(
                f => (f + WELCOME_GROUPS.length - 1) % WELCOME_GROUPS.length,
              );
            }}
            onNext={() => {
              sfx('decide');
              setFeatured(f => (f + 1) % WELCOME_GROUPS.length);
            }}
          />
          <div className="info__head">Important Info:</div>
          {(() => {
            const infoRows = [
              { id: 'pin-info', label: 'Welcome to the XP Shop!' },
              { id: 'pin-help', label: 'How does downloading work?' },
              ...SHOP_NEWS.map(n => ({ id: n.id, label: n.title, news: true })),
            ];
            const pages = Math.max(1, Math.ceil(infoRows.length / 3));
            const p = Math.min(newsPage, pages - 1);
            return (
              <>
                <div className="info__rows">
                  {infoRows.slice(p * 3, p * 3 + 3).map(row => (
                    <button
                      key={row.id}
                      className="info__row"
                      onMouseEnter={hover}
                      onClick={() => {
                        sfx('decide');
                        if (row.news) {
                          if (!readNews.includes(row.id))
                            setHive('shopNewsRead', [...readNews, row.id]);
                          go('news', { newsId: row.id });
                        } else {
                          go(row.id === 'pin-info' ? 'info' : 'help');
                        }
                      }}
                    >
                      {row.news && !readNews.includes(row.id) && (
                        <img className="info__new" src={newBadge} alt="NEW" />
                      )}
                      {row.label}
                    </button>
                  ))}
                </div>
                {pages > 1 && (
                  <>
                    <button
                      className={'info__nav info__nav--l' + (p > 0 ? '' : ' is-off')}
                      onMouseEnter={hover}
                      onClick={() => {
                        sfx('decide');
                        setNewsPage(p - 1);
                      }}
                    >
                      ‹
                    </button>
                    <button
                      className={
                        'info__nav info__nav--r' +
                        (p < pages - 1 ? '' : ' is-off')
                      }
                      onMouseEnter={hover}
                      onClick={() => {
                        sfx('decide');
                        setNewsPage(p + 1);
                      }}
                    >
                      ›
                    </button>
                  </>
                )}
              </>
            );
          })()}
          <button
            className="goshop"
            onMouseEnter={hover}
            onClick={() => {
              sfx('decide');
              setStack([{ screen: 'main' }]);
            }}
          >
            <span>Start Shopping</span>
          </button>
        </>
      );
      break;
    }

    case 'main': {
      page = (
        <>
          <div className="pgtitle">XP Shop</div>
          <div className="dots dots--top" />
          {SHELF_ORDER.map((key, i) => (
            <button
              key={key}
              className={
                `panelbtn panelbtn--${i}` +
                (SHELVES[key].over ? '' : ' panelbtn--flat')
              }
              onMouseEnter={() => {
                hover();
                setHoverShelf(key);
              }}
              onMouseLeave={() => setHoverShelf(s => (s === key ? null : s))}
              onClick={() => {
                sfx('decide');
                go('shelfhub', { shelf: key });
              }}
            >
              <img src={SHELVES[key].panel} alt={SHELVES[key].label} />
              {SHELVES[key].over && (
                <img
                  className="panelbtn__over"
                  src={SHELVES[key].over}
                  alt=""
                />
              )}
              {SHELVES[key].logo && (
                <span className="panelbtn__logo">
                  XP<i>Ware</i>
                  <b>™</b>
                </span>
              )}
              <span className="panelbtn__label">{SHELVES[key].label}</span>
            </button>
          ))}
          {hoverShelf && (
            <div
              className="plate"
              style={{
                justifyContent:
                  hoverShelf === SHELF_ORDER[0]
                    ? 'flex-start'
                    : hoverShelf === SHELF_ORDER[1]
                    ? 'center'
                    : 'flex-end',
              }}
            >
              <img src={plateL} alt="" />
              <span className="plate__body">{SHELF_INFO[hoverShelf]}</span>
              <img src={plateR} alt="" />
            </div>
          )}
          <button
            className="wpbanner"
            onMouseEnter={hover}
            onClick={() => {
              sfx('decide');
              go('points');
            }}
          >
            <span>Add XP Points</span>
          </button>
          {[
            ['Account Activity', 'account'],
            ["Titles You've Downloaded", 'downloads'],
            ['Settings and Features', 'settings'],
          ].map(([label, screen], i) => (
            <button
              key={screen}
              className={`pill pill--${i}`}
              onMouseEnter={hover}
              onClick={() => {
                sfx('decide');
                go(screen);
              }}
            >
              <span>{label}</span>
            </button>
          ))}
          <div className="dots dots--bottom" />
          {underBtn('l', 'Desktop', () => {
            sfx('cancel');
            if (onClose) onClose();
          })}
          {pointsBadge}
          {underBtn('r', 'Welcome Screen', () => {
            sfx('cancel');
            setStack([{ screen: 'welcome' }]);
          })}
        </>
      );
      break;
    }

    case 'shelfhub': {
      const shelf = SHELVES[cur.shelf] || SHELVES.xpware;
      page = (
        <>
          <div className="pgtitle pgtitle--black">{shelf.label}</div>
          <div className="dots dots--top" />
          <div className="hub__sub">{SHELF_INFO[cur.shelf]}</div>
          <button
            className="hubbtn hubbtn--half"
            style={{ left: 28 }}
            onMouseEnter={hover}
            onClick={() => {
              sfx('decide');
              go('list', { shelf: cur.shelf, mode: 'all', page: 0 });
            }}
          >
            <span>Popular Titles</span>
          </button>
          <button
            className="hubbtn hubbtn--half"
            style={{ left: 320 }}
            onMouseEnter={hover}
            onClick={() => {
              sfx('decide');
              go('list', { shelf: cur.shelf, mode: 'new', page: 0 });
            }}
          >
            <span>Newest Additions</span>
          </button>
          <button
            className="hubbtn hubbtn--full"
            style={{ top: 190 }}
            onMouseEnter={hover}
            onClick={() => {
              sfx('decide');
              go('catpick', { shelf: cur.shelf });
            }}
          >
            <span>Search by Category</span>
          </button>
          <button
            className="hubbtn hubbtn--full"
            style={{ top: 275 }}
            onMouseEnter={hover}
            onClick={() => {
              sfx('decide');
              go('search', { shelf: cur.shelf });
            }}
          >
            <span>{SHELF_SEARCH[cur.shelf] || 'Search by Title'}</span>
          </button>
          {backFooter()}
        </>
      );
      break;
    }

    case 'catpick': {
      page = (
        <>
          <div className="pgtitle pgtitle--black">Search by Category</div>
          <div className="dots dots--top" />
          {[
            ['Publisher', 125, 'publisher'],
            ['Genre', 235, 'category'],
          ].map(([label, top, catKey]) => (
            <button
              key={catKey}
              className="sortbtn"
              style={{ top }}
              onMouseEnter={hover}
              onClick={() => {
                sfx('decide');
                go('catcards', { shelf: cur.shelf, catKey, page: 0 });
              }}
            >
              <span>{label}</span>
            </button>
          ))}
          {backFooter()}
        </>
      );
      break;
    }

    case 'catcards': {
      const isPub = cur.catKey === 'publisher';
      const counts = new Map();
      for (const a of apps.filter(a => a.shelf === cur.shelf)) {
        const k = isPub ? a.publisher : a.category;
        counts.set(k, (counts.get(k) || 0) + 1);
      }
      const cats = [...counts.entries()].sort((a, b) =>
        a[0].localeCompare(b[0]),
      );
      const CARDS_PER = 6;
      const slice = cats.slice(
        pageNo * CARDS_PER,
        pageNo * CARDS_PER + CARDS_PER,
      );
      page = (
        <>
          <div className="pgtitle pgtitle--black">
            Search by {isPub ? 'Publisher' : 'Genre'}
          </div>
          <div className="dots dots--top" />
          {slice.map(([name, count], i) => (
            <button
              key={name}
              className="cardbtn"
              style={{
                left: i % 2 ? 281 : 37,
                top: 90 + Math.floor(i / 2) * 92,
              }}
              onMouseEnter={hover}
              onClick={() => {
                sfx('decide');
                go('list', {
                  shelf: cur.shelf,
                  mode: 'cat',
                  catKey: cur.catKey,
                  catValue: name,
                  page: 0,
                });
              }}
            >
              <span className="cardbtn__name">{name}</span>
              <span className="cardbtn__count">Titles: {count}</span>
            </button>
          ))}
          {backFooter()}
          {pager(cats, CARDS_PER)}
        </>
      );
      break;
    }

    case 'search': {
      page = (
        <Keyboard
          hover={hover}
          sfx={sfx}
          onQuit={goBack}
          onOk={q => {
            sfx('decide');
            setStack(s => [
              ...s.slice(0, -1),
              {
                screen: 'list',
                shelf: cur.shelf,
                mode: 'query',
                query: q,
                page: 0,
              },
            ]);
          }}
        />
      );
      break;
    }

    case 'list': {
      let items = apps.filter(a => a.shelf === cur.shelf);
      let title = 'Popular Titles';
      let empty = 'No titles are available here yet.';
      if (cur.mode === 'new') {
        // later catalog entries are the newer additions
        items = items.slice().reverse();
        title = 'Newest Additions';
      } else if (cur.mode === 'cat') {
        items = items.filter(
          a =>
            (cur.catKey === 'publisher' ? a.publisher : a.category) ===
            cur.catValue,
        );
        title = cur.catValue;
      } else if (cur.mode === 'query') {
        const q = (cur.query || '').trim().toLowerCase();
        items = q ? items.filter(a => a.name.toLowerCase().includes(q)) : [];
        title = `Results for ${(cur.query || '').trim()}`;
        empty = 'No titles matched your search.';
      }
      page = (
        <>
          <div className="pgtitle pgtitle--black">{title}</div>
          <div className="dots dots--top" />
          {pagedList(items, empty)}
          {backFooter()}
          {pager(items)}
        </>
      );
      break;
    }

    case 'title': {
      const app = byId(cur.appId);
      if (!app) break;
      page = (
        <>
          <div className="pgtitle pgtitle--black">Details</div>
          <div className="dots dots--top" />
          <div className="b05">
            <div className="b05__shelf">{SHELVES[app.shelf].label}</div>
            <div className="b05__photo">
              {(() => {
                const gallery =
                  app.kind === 'media' &&
                  app.dest === 'pictures' &&
                  app.files.length > 0
                    ? mediaFileUrls(app)
                    : null;
                if (!gallery) return <img src={app.icon} alt="" />;
                const idx =
                  ((previewIdx % gallery.length) + gallery.length) %
                  gallery.length;
                return (
                  <>
                    <img className="b05__shot" src={gallery[idx]} alt="" />
                    {gallery.length > 1 && (
                      <>
                        <button
                          className="details__pv details__pv--l"
                          onMouseEnter={hover}
                          onClick={() => {
                            sfx('decide');
                            setPreviewIdx(i => i - 1);
                          }}
                        >
                          ‹
                        </button>
                        <button
                          className="details__pv details__pv--r"
                          onMouseEnter={hover}
                          onClick={() => {
                            sfx('decide');
                            setPreviewIdx(i => i + 1);
                          }}
                        >
                          ›
                        </button>
                        <span className="details__pvcount">
                          {idx + 1}/{gallery.length}
                        </span>
                      </>
                    )}
                  </>
                );
              })()}
            </div>
            <div className="b05__desc">{app.description}</div>
            <div className="b05__released">Released {app.released}</div>
            {app.players && <div className="b05__players">{app.players}</div>}
            <div className="b05__pub">{app.publisher}</div>
            <div className="b05__cat">{app.category}</div>
            <div className="b05__name">{app.name}</div>
          </div>
          {app.installed ? (
            <button
              className="buybtn"
              onMouseEnter={hover}
              onClick={() => {
                sfx('decide');
                let target = app.exePath;
                if (app.kind === 'media') {
                  // music plays its first track; everything else opens
                  // the pack folder in Explorer
                  target =
                    app.dest === 'music'
                      ? mediaFilePaths(app, userRef.current)[0]
                      : mediaPackDir(app, userRef.current);
                }
                if (onShellOpen && target) onShellOpen(target);
              }}
            >
              <span className="buybtn__act">
                {app.kind === 'media'
                  ? app.dest === 'music'
                    ? 'Play'
                    : 'Open'
                  : 'Start'}
              </span>
              <span className="buybtn__price">Downloaded</span>
            </button>
          ) : (
            <button
              className="buybtn"
              onMouseEnter={hover}
              onClick={() => {
                sfx('decide');
                go('confirm', { appId: app.id });
              }}
            >
              <span className="buybtn__act">Download</span>
              <span className="buybtn__price">{priceLabel(app)}</span>
            </button>
          )}
          {backFooter(
            app.installed
              ? underBtn('r', 'Delete Title', () => {
                  sfx('decide');
                  go('delconfirm', { appId: app.id });
                })
              : null,
          )}
        </>
      );
      break;
    }

    case 'confirm': {
      const app = byId(cur.appId);
      if (!app) break;
      const affordable = points >= app.price;
      const noun = app.kind === 'media' ? 'title' : 'software';
      page = (
        <>
          <div className="pgtitle pgtitle--black">Download Confirmation</div>
          <div className="dots dots--top" />
          <div className="dlc">
            <div className="dlc__name">{app.name}</div>
            <div className="dlc__rows">
              <div className="dlc__row">
                <span className="dlc__label">Current XP Points:</span>
                <span className="dlc__value">{points}</span>
                <span className="dlc__unit">XP Points</span>
              </div>
              <div className="dlc__row dlc__row--due">
                <span className="dlc__label">XP Points to Download:</span>
                <span className="dlc__value">{app.price}</span>
                <span className="dlc__unit">XP Points</span>
              </div>
              <div className="dlc__row">
                <span className="dlc__label">XP Points after Download:</span>
                <span className="dlc__value">
                  {Math.max(0, points - app.price)}
                </span>
                <span className="dlc__unit">XP Points</span>
              </div>
            </div>
            <div className="dlc__caption">
              Downloading this {noun} requires {app.price} XP Points.
            </div>
          </div>
          {affordable ? (
            <div className="dlc__ask">Download this {noun} now?</div>
          ) : (
            <div className="dlc__ask dlc__ask--warn">
              You need {app.price - points} more XP Points for this title.
              {everFoundEgg
                ? ' Eggs can be traded on the Add XP Points page.'
                : ' The Add XP Points page explains how points are earned.'}
            </div>
          )}
          <div className="dots dots--bottom" />
          {affordable
            ? underBtn('l', 'Yes', () => {
                sfx('decide');
                if (app.price > 0) {
                  setHive('xpPoints', points - app.price);
                  setHive('xpOwned', [...ownedIds, app.id]);
                  setHive('xpSpent', pointsSpent + app.price);
                }
                setStack(s2 => [
                  ...s2.slice(0, -1),
                  { screen: 'downloading', appId: app.id },
                ]);
              })
            : underBtn('l', 'Back', goBack)}
          {pointsBadge}
          {affordable && underBtn('r', 'No', goBack)}
        </>
      );
      break;
    }

    case 'downloading': {
      const app = byId(cur.appId);
      if (!app) break;
      page = (
        <>
          <div className="pgtitle pgtitle--black">
            {app.kind === 'media' ? 'Download' : 'Download Software'}
          </div>
          <div className="dots dots--top" />
          <div className="dl__info">
            You are downloading
            <br />
            <span className="blue">{app.name}</span>
            <br />
            <br />
            XP Points after Download: {points} XP Points
          </div>
          <MarioDownload
            gain={soundOn ? effectiveVolume : 0}
            onDone={() => {
              installApp(vfsRef.current, app, userRef.current);
              setHive('xpDownloads', downloadCount + 1);
              sfx('finish');
              setStack(s => [
                ...s.slice(0, -1),
                { screen: 'complete', appId: app.id },
              ]);
            }}
          />
          <div className="dots dots--bottom" />
          {pointsBadge}
        </>
      );
      break;
    }

    case 'complete': {
      const app = byId(cur.appId);
      page = (
        <>
          <div className="pgtitle pgtitle--black">Download</div>
          <div className="dots dots--top" />
          <div className="content">
            Your download was successful!
            <br />
            <br />
            {app ? app.name : 'The title'}{' '}
            {app && app.kind === 'media'
              ? `has been saved to ${mediaDestLabel(app)}.`
              : 'has been downloaded.'}
          </div>
          {underBtn('midup', 'OK', () => {
            sfx('decide');
            if (app) jumpToTitle(app);
            else setStack([{ screen: 'main' }]);
          })}
          <div className="dots dots--bottom" />
          {pointsBadge}
        </>
      );
      break;
    }

    case 'delconfirm': {
      const app = byId(cur.appId);
      if (!app) break;
      page = (
        <>
          <div className="pgtitle pgtitle--black">Delete Title</div>
          <div className="dots dots--top" />
          <div className="content">
            {app.name}
            <br />
            <br />
            {app.kind === 'media'
              ? `The files will be removed from ${mediaDestLabel(app)}. You ` +
                'can download them again from the shop at any time.'
              : 'The title will be removed from this computer. You can ' +
                'download it again from the shop at any time.'}
            <br />
            <br />
            <span className="warn">Delete this title?</span>
          </div>
          <div className="dots dots--bottom" />
          {underBtn('l', 'Back', goBack)}
          {pointsBadge}
          {underBtn('r', 'Delete', () => {
            sfx('decide');
            uninstallApp(vfsRef.current, app, userRef.current);
            setStack(s => [
              ...s.slice(0, -1),
              { screen: 'deldone', appId: app.id },
            ]);
          })}
        </>
      );
      break;
    }

    case 'deldone': {
      const app = byId(cur.appId);
      page = (
        <>
          <div className="pgtitle pgtitle--black">Delete Title</div>
          <div className="dots dots--top" />
          <div className="content">
            The title has been deleted.
            <br />
            <br />
            You can download it again from the shop at any time.
          </div>
          {underBtn('midup', 'OK', () => {
            sfx('decide');
            if (app) jumpToTitle(app);
            else setStack([{ screen: 'main' }]);
          })}
          <div className="dots dots--bottom" />
          {pointsBadge}
        </>
      );
      break;
    }

    case 'downloads': {
      page = (
        <>
          <div className="pgtitle">Titles You've Downloaded</div>
          <div className="dots dots--top" />
          {pagedList(
            installedApps,
            'Nothing here yet. Everything is still waiting in the shop.',
            true,
          )}
          {backFooter()}
          {pager(installedApps)}
        </>
      );
      break;
    }

    case 'points': {
      const eggCount = eggList.length;
      page = (
        <>
          <div className="pgtitle">Add XP Points</div>
          <div className="dots dots--top" />
          <div className="pts">
            {everFoundEgg ? (
              <>
                <div className="pts__rate">
                  XP Points cards are no longer sold, but eggs are accepted:{' '}
                  <span className="blue">1 egg = 50 XP Points</span>.
                </div>
                <div className="pts__wallet">
                  <img src={eggImg} alt="Egg" />
                  <span>&times; {eggCount}</span>
                </div>
                {eggCount === 0 && (
                  <div className="pts__hint">
                    No eggs right now. If you ever find one, bring it here.
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="pts__rate">
                  XP Points cards are no longer sold.
                </div>
                <div className="pts__hint">
                  Nothing to trade right now. If you ever find something this
                  computer wants, bring it here.
                </div>
              </>
            )}
          </div>
          {everFoundEgg &&
            eggCount > 0 &&
            underBtn(
              'l',
              'Trade 1 Egg',
              () => {
                sfx('decide');
                tradeEggs(1);
              },
              { style: { top: 268 } },
            )}
          {everFoundEgg &&
            eggCount > 1 &&
            underBtn(
              'r',
              `Trade All (${eggCount})`,
              () => {
                sfx('decide');
                tradeEggs(eggCount);
              },
              { style: { top: 268 } },
            )}
          <div className="dots dots--bottom" />
          {backFooter()}
        </>
      );
      break;
    }

    case 'account': {
      // Existing accounts predate the download tally; the installed count
      // keeps the number honest for them.
      const totalDownloads = Math.max(downloadCount, installedApps.length);
      const rows = [
        ['Titles downloaded', totalDownloads],
        ['Titles purchased', ownedIds.length],
        ['XP Points balance', `${points} XP Points`],
        ['XP Points spent', `${pointsSpent} XP Points`],
        // The egg economy stays off the books until this user is in on it
        ...(everFoundEgg
          ? [
              ['Eggs on hand', eggList.length],
              ['Eggs traded in', eggsTraded],
              ['XP Points from eggs', `${eggsTraded * 50} XP Points`],
            ]
          : []),
      ];
      page = (
        <>
          <div className="pgtitle">Account Activity</div>
          <div className="dots dots--top" />
          <div className="acct">
            {rows.map(([label, value]) => (
              <div className="acct__row" key={label}>
                <span className="acct__label">{label}</span>
                <span className="acct__value">{value}</span>
              </div>
            ))}
          </div>
          {backFooter()}
        </>
      );
      break;
    }

    case 'settings': {
      page = (
        <>
          <div className="pgtitle">Settings and Features</div>
          <div className="dots dots--top" />
          <div className="content">Sound and music settings for the shop.</div>
          {underBtn(
            'l',
            `Music: ${musicOn ? 'On' : 'Off'}`,
            () => {
              sfx('decide');
              setMusicOn(v => !v);
            },
            { style: { top: 290 } },
          )}
          {underBtn(
            'r',
            `Sound: ${soundOn ? 'On' : 'Off'}`,
            () => {
              playUi('decide', volRef.current * 0.6);
              setSoundOn(v => !v);
            },
            { style: { top: 290 } },
          )}
          {backFooter()}
        </>
      );
      break;
    }

    case 'help': {
      page = (
        <>
          <div className="pgtitle">Shopping Guide</div>
          <div className="dots dots--top" />
          <div className="content content--left">
            1. Pick a catalog from the Main Menu: Games, XPWare or Extras.
            <br />
            2. Choose a title to see its details.
            <br />
            3. Press <span className="blue">Download</span>. Software shows up
            in the Start menu under Shop Apps. Extras are saved into your own
            folders, like My Music.
            <br />
            <br />
            Deleting a title only removes it from this PC. You can download it
            again at any time.{' '}
            {everFoundEgg
              ? 'Paid titles cost XP Points, which you can get by trading ' +
                'eggs on the Add XP Points page.'
              : 'Paid titles cost XP Points. The Add XP Points page ' +
                'explains how points are earned.'}
          </div>
          {backFooter()}
        </>
      );
      break;
    }

    case 'news': {
      const item = SHOP_NEWS.find(n => n.id === cur.newsId) || SHOP_NEWS[0];
      if (!item) break;
      page = (
        <>
          <div className="pgtitle">Important Info</div>
          <div className="dots dots--top" />
          <div className="content content--left">
            <span className="blue">{item.title}</span>
            <br />
            <br />
            {item.body}
          </div>
          {backFooter()}
        </>
      );
      break;
    }

    case 'info': {
      page = (
        <>
          <div className="pgtitle">Important Info</div>
          <div className="dots dots--top" />
          <div className="content">
            <span className="blue">Welcome to the XP Shop!</span>
            <br />
            <br />
            Everything here is optional. Download what you like, delete what you
            don't, and anything can be downloaded again later.
            <br />
            <br />
            New titles will be added from time to time.
          </div>
          {backFooter()}
        </>
      );
      break;
    }

    default:
      break;
  }

  return (
    <Shell ref={shellRef}>
      <div
        className="cvs"
        style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {page}
      </div>
    </Shell>
  );
}
