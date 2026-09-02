// The main menu (W_03): the three catalog panels with their nameplate
// bubble, the Add XP Points banner, the three option pills and the footer.
import { SHELF_INFO } from '../catalog';
import { SHELVES, SHELF_ORDER } from '../constants';
import { PageTitle, PointsBadge, UnderBtn } from '../parts';
import { plateL, plateR } from '../art';

const PILLS = [
  ['Account Activity', 'account'],
  ["Titles You've Downloaded", 'downloads'],
  ['Settings and Features', 'settings'],
];
const PLATE_ALIGN = ['flex-start', 'center', 'flex-end'];

export default function MainMenu({ shop }) {
  const { go, reset } = shop.nav;
  const { sfx, hover } = shop.audio;
  const { hoverShelf, setHoverShelf } = shop.ui;
  return (
    <>
      <PageTitle>XP Shop</PageTitle>
      {SHELF_ORDER.map((key, i) => {
        const shelf = SHELVES[key];
        return (
          <button
            key={key}
            className={
              `panelbtn panelbtn--${i}` + (shelf.over ? '' : ' panelbtn--flat')
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
            <img src={shelf.panel} alt={shelf.label} />
            {shelf.over && (
              <img className="panelbtn__over" src={shelf.over} alt="" />
            )}
            {shelf.logo && (
              <span className="panelbtn__logo">
                XP<i>Ware</i>
                <b>™</b>
              </span>
            )}
            <span className="panelbtn__label">{shelf.label}</span>
          </button>
        );
      })}
      {hoverShelf && (
        <div
          className="plate"
          style={{ justifyContent: PLATE_ALIGN[SHELF_ORDER.indexOf(hoverShelf)] }}
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
      {PILLS.map(([label, screen], i) => (
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
      <UnderBtn
        pos="l"
        label="Desktop"
        hover={hover}
        onClick={() => {
          sfx('cancel');
          if (shop.onClose) shop.onClose();
        }}
      />
      <PointsBadge points={shop.account.points} />
      <UnderBtn
        pos="r"
        label="Welcome Screen"
        hover={hover}
        onClick={() => {
          sfx('cancel');
          reset('welcome');
        }}
      />
    </>
  );
}
