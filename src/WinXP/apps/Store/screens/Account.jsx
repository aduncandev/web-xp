// The shopper's own pages: the titles they hold, Add XP Points (the egg
// counter), Account Activity and the sound switches.
import eggImg from 'assets/windowsIcons/egg.png';

import { POINTS_PER_EGG } from '../useShopAccount';
import { playUi } from '../sfx';
import { BackFooter, PagedList, PageTitle, Pager, UnderBtn } from '../parts';

export function Downloads({ shop }) {
  const items = shop.installedApps;
  return (
    <>
      <PageTitle>Titles You've Downloaded</PageTitle>
      <PagedList
        shop={shop}
        items={items}
        emptyText="Nothing here yet. Everything is still waiting in the shop."
        showSize
      />
      <BackFooter shop={shop} />
      <Pager shop={shop} items={items} />
    </>
  );
}

export function Points({ shop }) {
  const { sfx, hover } = shop.audio;
  const { eggList, everFoundEgg, tradeEggs } = shop.account;
  const eggCount = eggList.length;
  const trade = (pos, label, n) => (
    <UnderBtn
      pos={pos}
      label={label}
      hover={hover}
      style={{ top: 268 }}
      onClick={() => {
        sfx('decide');
        tradeEggs(n);
      }}
    />
  );
  return (
    <>
      <PageTitle>Add XP Points</PageTitle>
      <div className="pts">
        {everFoundEgg ? (
          <>
            <div className="pts__rate">
              XP Points cards are no longer sold, but eggs are accepted:{' '}
              <span className="blue">1 egg = {POINTS_PER_EGG} XP Points</span>.
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
            <div className="pts__rate">XP Points cards are no longer sold.</div>
            <div className="pts__hint">
              Nothing to trade right now. If you ever find something this
              computer wants, bring it here.
            </div>
          </>
        )}
      </div>
      {everFoundEgg && eggCount > 0 && trade('l', 'Trade 1 Egg', 1)}
      {everFoundEgg &&
        eggCount > 1 &&
        trade('r', `Trade All (${eggCount})`, eggCount)}
      <BackFooter shop={shop} />
    </>
  );
}

export function AccountActivity({ shop }) {
  const a = shop.account;
  // Existing accounts predate the download tally; the installed count
  // keeps the number honest for them
  const totalDownloads = Math.max(a.downloadCount, shop.installedApps.length);
  const rows = [
    ['Titles downloaded', totalDownloads],
    ['Titles purchased', a.ownedIds.length],
    ['XP Points balance', `${a.points} XP Points`],
    ['XP Points spent', `${a.pointsSpent} XP Points`],
    // The egg economy stays off the books until this user is in on it
    ...(a.everFoundEgg
      ? [
          ['Eggs on hand', a.eggList.length],
          ['Eggs traded in', a.eggsTraded],
          ['XP Points from eggs', `${a.eggsTraded * POINTS_PER_EGG} XP Points`],
        ]
      : []),
  ];
  return (
    <>
      <PageTitle>Account Activity</PageTitle>
      <div className="acct">
        {rows.map(([label, value]) => (
          <div className="acct__row" key={label}>
            <span className="acct__label">{label}</span>
            <span className="acct__value">{value}</span>
          </div>
        ))}
      </div>
      <BackFooter shop={shop} />
    </>
  );
}

export function Settings({ shop }) {
  const { sfx, hover, musicOn, setMusicOn, soundOn, setSoundOn, volRef } =
    shop.audio;
  return (
    <>
      <PageTitle>Settings and Features</PageTitle>
      <div className="content">Sound and music settings for the shop.</div>
      <UnderBtn
        pos="l"
        label={`Music: ${musicOn ? 'On' : 'Off'}`}
        hover={hover}
        style={{ top: 290 }}
        onClick={() => {
          sfx('decide');
          setMusicOn(v => !v);
        }}
      />
      <UnderBtn
        pos="r"
        label={`Sound: ${soundOn ? 'On' : 'Off'}`}
        hover={hover}
        style={{ top: 290 }}
        onClick={() => {
          // the click is heard either way, so turning sound on confirms itself
          playUi('decide', volRef.current * 0.6);
          setSoundOn(v => !v);
        }}
      />
      <BackFooter shop={shop} />
    </>
  );
}
