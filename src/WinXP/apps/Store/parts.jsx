// Fragments every page shares: the title and its dotted rule, the glossy
// footer buttons, the points badge, the Back footer, a paged title list and
// its page arrows.
import { PER_PAGE } from './constants';
import { fmtSize } from './catalog';
import { priceLabel } from './catalogView';
import { newBadge } from './art';

export function PageTitle({ black, children }) {
  return (
    <>
      <div className={`pgtitle${black ? ' pgtitle--black' : ''}`}>{children}</div>
      <div className="dots dots--top" />
    </>
  );
}

/** A footer button; `pos` is l, r, mid or midup. */
export function UnderBtn({ pos, label, onClick, style, hover }) {
  return (
    <button
      className={`underbtn underbtn--${pos}`}
      onMouseEnter={hover}
      onClick={onClick}
      style={style}
    >
      <span>{label}</span>
    </button>
  );
}

export function PointsBadge({ points }) {
  return (
    <div className="points">
      {points}
      <small>XP Points</small>
    </div>
  );
}

export function BackFooter({ shop, right = null }) {
  return (
    <>
      <div className="dots dots--bottom" />
      <UnderBtn pos="l" label="Back" onClick={shop.nav.goBack} hover={shop.audio.hover} />
      <PointsBadge points={shop.account.points} />
      {right}
    </>
  );
}

export function PagedList({ shop, items, emptyText, showSize = false }) {
  const { pageNo, go } = shop.nav;
  const { sfx, hover } = shop.audio;
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
}

export function Pager({ shop, items, per = PER_PAGE }) {
  const { pageNo, setPage } = shop.nav;
  const { sfx, hover } = shop.audio;
  const pages = Math.max(1, Math.ceil(items.length / per));
  if (pages <= 1) return null;
  const arrow = (dir, to) => (
    <button
      className={`pgarrow pgarrow--${dir}`}
      onMouseEnter={hover}
      onClick={() => {
        sfx('decide');
        setPage(to);
      }}
    />
  );
  return (
    <>
      {pageNo > 0 && arrow('l', pageNo - 1)}
      <div className="pgnum">
        {Math.min(pageNo, pages - 1) + 1}/{pages}
      </div>
      {pageNo < pages - 1 && arrow('r', pageNo + 1)}
    </>
  );
}
