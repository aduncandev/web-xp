// The welcome page (W_01): a themed shelf of four titles that pages itself,
// the Important Info panel and the big Start Shopping banner.
import { SHOP_NEWS, WELCOME_GROUPS } from '../catalog';
import { priceLabel } from '../catalogView';
import { newBadge, welcomeBg } from '../art';
import WgArrows from '../WgArrows';

const INFO_ROWS = [
  { id: 'pin-info', label: 'Welcome to the XP Shop!' },
  { id: 'pin-help', label: 'How does downloading work?' },
  ...SHOP_NEWS.map(n => ({ id: n.id, label: n.title, news: true })),
];
const ROWS_PER_PAGE = 3;

function ImportantInfo({ shop }) {
  const { go } = shop.nav;
  const { sfx, hover } = shop.audio;
  const { readNews, markNewsRead } = shop.account;
  const { newsPage, setNewsPage } = shop.ui;
  const pages = Math.max(1, Math.ceil(INFO_ROWS.length / ROWS_PER_PAGE));
  const p = Math.min(newsPage, pages - 1);
  const chevron = (dir, on, to) => (
    <button
      className={`info__nav info__nav--${dir}` + (on ? '' : ' is-off')}
      onMouseEnter={hover}
      onClick={() => {
        sfx('decide');
        setNewsPage(to);
      }}
    >
      {dir === 'l' ? '‹' : '›'}
    </button>
  );
  return (
    <>
      <div className="info__head">Important Info:</div>
      <div className="info__rows">
        {INFO_ROWS.slice(p * ROWS_PER_PAGE, p * ROWS_PER_PAGE + ROWS_PER_PAGE).map(
          row => (
            <button
              key={row.id}
              className="info__row"
              onMouseEnter={hover}
              onClick={() => {
                sfx('decide');
                if (row.news) {
                  markNewsRead(row.id);
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
          ),
        )}
      </div>
      {pages > 1 && (
        <>
          {chevron('l', p > 0, p - 1)}
          {chevron('r', p < pages - 1, p + 1)}
        </>
      )}
    </>
  );
}

export default function Welcome({ shop }) {
  const { featured, setFeatured } = shop.ui;
  const { sfx, hover } = shop.audio;
  const n = WELCOME_GROUPS.length;
  const group = WELCOME_GROUPS[featured % n];
  const cells = group.ids.map(shop.byId).filter(Boolean);
  return (
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
            shop.nav.jumpToTitle(app);
          }}
        >
          {app.isNew && <img className="wg__new" src={newBadge} alt="NEW" />}
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
          setFeatured(f => (f + n - 1) % n);
        }}
        onNext={() => {
          sfx('decide');
          setFeatured(f => (f + 1) % n);
        }}
      />
      <ImportantInfo shop={shop} />
      <button
        className="goshop"
        onMouseEnter={hover}
        onClick={() => {
          sfx('decide');
          shop.nav.reset('main');
        }}
      >
        <span>Start Shopping</span>
      </button>
    </>
  );
}
