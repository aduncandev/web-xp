// Browsing a shelf: its front page (B_01), Search by Category and the
// category cards, the search keyboard, and the title lists themselves.
import { SHELF_INFO, SHELF_SEARCH } from '../catalog';
import { SHELVES } from '../constants';
import { BackFooter, PagedList, PageTitle, Pager } from '../parts';
import Keyboard from '../Keyboard';

export function ShelfHub({ shop }) {
  const { cur, go } = shop.nav;
  const { sfx, hover } = shop.audio;
  const shelf = SHELVES[cur.shelf] || SHELVES.xpware;
  const hubBtn = (cls, style, label, onClick) => (
    <button
      className={`hubbtn ${cls}`}
      style={style}
      onMouseEnter={hover}
      onClick={() => {
        sfx('decide');
        onClick();
      }}
    >
      <span>{label}</span>
    </button>
  );
  return (
    <>
      <PageTitle black>{shelf.label}</PageTitle>
      <div className="hub__sub">{SHELF_INFO[cur.shelf]}</div>
      {hubBtn('hubbtn--half', { left: 28 }, 'Popular Titles', () =>
        go('list', { shelf: cur.shelf, mode: 'all', page: 0 }),
      )}
      {hubBtn('hubbtn--half', { left: 320 }, 'Newest Additions', () =>
        go('list', { shelf: cur.shelf, mode: 'new', page: 0 }),
      )}
      {hubBtn('hubbtn--full', { top: 190 }, 'Search by Category', () =>
        go('catpick', { shelf: cur.shelf }),
      )}
      {hubBtn(
        'hubbtn--full',
        { top: 275 },
        SHELF_SEARCH[cur.shelf] || 'Search by Title',
        () => go('search', { shelf: cur.shelf }),
      )}
      <BackFooter shop={shop} />
    </>
  );
}

export function CatPick({ shop }) {
  const { cur, go } = shop.nav;
  const { sfx, hover } = shop.audio;
  return (
    <>
      <PageTitle black>Search by Category</PageTitle>
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
      <BackFooter shop={shop} />
    </>
  );
}

const CARDS_PER = 6;

export function CatCards({ shop }) {
  const { cur, go, pageNo } = shop.nav;
  const { sfx, hover } = shop.audio;
  const isPub = cur.catKey === 'publisher';
  const counts = new Map();
  for (const a of shop.apps.filter(a => a.shelf === cur.shelf)) {
    const k = isPub ? a.publisher : a.category;
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const cats = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const slice = cats.slice(pageNo * CARDS_PER, pageNo * CARDS_PER + CARDS_PER);
  return (
    <>
      <PageTitle black>Search by {isPub ? 'Publisher' : 'Genre'}</PageTitle>
      {slice.map(([name, count], i) => (
        <button
          key={name}
          className="cardbtn"
          style={{ left: i % 2 ? 281 : 37, top: 90 + Math.floor(i / 2) * 92 }}
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
      <BackFooter shop={shop} />
      <Pager shop={shop} items={cats} per={CARDS_PER} />
    </>
  );
}

export function SearchScreen({ shop }) {
  const { cur, goBack, replaceTop } = shop.nav;
  const { sfx, hover } = shop.audio;
  return (
    <Keyboard
      hover={hover}
      sfx={sfx}
      onQuit={goBack}
      onOk={q => {
        sfx('decide');
        replaceTop({
          screen: 'list',
          shelf: cur.shelf,
          mode: 'query',
          query: q,
          page: 0,
        });
      }}
    />
  );
}

/** A shelf's titles: all of them, the newest, one category, or a search's results. */
export function TitleList({ shop }) {
  const { cur } = shop.nav;
  let items = shop.apps.filter(a => a.shelf === cur.shelf);
  let title = 'Popular Titles';
  let empty = 'No titles are available here yet.';
  if (cur.mode === 'new') {
    // later catalog entries are the newer additions
    items = items.slice().reverse();
    title = 'Newest Additions';
  } else if (cur.mode === 'cat') {
    items = items.filter(
      a =>
        (cur.catKey === 'publisher' ? a.publisher : a.category) === cur.catValue,
    );
    title = cur.catValue;
  } else if (cur.mode === 'query') {
    const q = (cur.query || '').trim().toLowerCase();
    items = q ? items.filter(a => a.name.toLowerCase().includes(q)) : [];
    title = `Results for ${(cur.query || '').trim()}`;
    empty = 'No titles matched your search.';
  }
  return (
    <>
      <PageTitle black>{title}</PageTitle>
      <PagedList shop={shop} items={items} emptyText={empty} />
      <BackFooter shop={shop} />
      <Pager shop={shop} items={items} />
    </>
  );
}
