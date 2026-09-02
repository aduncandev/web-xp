// Getting and giving back a title: the confirmation with its points sums,
// the download animation that installs it, the receipt, and the two
// delete pages.
import { installApp, mediaDestLabel, uninstallApp } from '../catalog';
import { PageTitle, PointsBadge, UnderBtn } from '../parts';
import MarioDownload from '../MarioDownload';

export function Confirm({ shop }) {
  const { cur, goBack, replaceTop } = shop.nav;
  const { sfx, hover } = shop.audio;
  const { points, everFoundEgg, purchase } = shop.account;
  const app = shop.byId(cur.appId);
  if (!app) return null;
  const affordable = points >= app.price;
  const noun = app.kind === 'media' ? 'title' : 'software';
  const row = (label, value, due) => (
    <div className={`dlc__row${due ? ' dlc__row--due' : ''}`}>
      <span className="dlc__label">{label}</span>
      <span className="dlc__value">{value}</span>
      <span className="dlc__unit">XP Points</span>
    </div>
  );
  return (
    <>
      <PageTitle black>Download Confirmation</PageTitle>
      <div className="dlc">
        <div className="dlc__name">{app.name}</div>
        <div className="dlc__rows">
          {row('Current XP Points:', points)}
          {row('XP Points to Download:', app.price, true)}
          {row('XP Points after Download:', Math.max(0, points - app.price))}
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
      {affordable ? (
        <UnderBtn
          pos="l"
          label="Yes"
          hover={hover}
          onClick={() => {
            sfx('decide');
            purchase(app);
            replaceTop({ screen: 'downloading', appId: app.id });
          }}
        />
      ) : (
        <UnderBtn pos="l" label="Back" hover={hover} onClick={goBack} />
      )}
      <PointsBadge points={points} />
      {affordable && <UnderBtn pos="r" label="No" hover={hover} onClick={goBack} />}
    </>
  );
}

export function Downloading({ shop }) {
  const { cur, replaceTop } = shop.nav;
  const { sfx, soundOn } = shop.audio;
  const { points, recordDownload } = shop.account;
  const app = shop.byId(cur.appId);
  if (!app) return null;
  return (
    <>
      <PageTitle black>
        {app.kind === 'media' ? 'Download' : 'Download Software'}
      </PageTitle>
      <div className="dl__info">
        You are downloading
        <br />
        <span className="blue">{app.name}</span>
        <br />
        <br />
        XP Points after Download: {points} XP Points
      </div>
      <MarioDownload
        gain={soundOn ? shop.effectiveVolume : 0}
        onDone={() => {
          installApp(shop.vfs, app, shop.userName);
          recordDownload();
          sfx('finish');
          replaceTop({ screen: 'complete', appId: app.id });
        }}
      />
      <div className="dots dots--bottom" />
      <PointsBadge points={points} />
    </>
  );
}

/** The OK that returns to the title's page, or to the menu if it has gone. */
function OkToTitle({ shop, app }) {
  const { sfx, hover } = shop.audio;
  return (
    <UnderBtn
      pos="midup"
      label="OK"
      hover={hover}
      onClick={() => {
        sfx('decide');
        if (app) shop.nav.jumpToTitle(app);
        else shop.nav.reset('main');
      }}
    />
  );
}

export function Complete({ shop }) {
  const app = shop.byId(shop.nav.cur.appId);
  return (
    <>
      <PageTitle black>Download</PageTitle>
      <div className="content">
        Your download was successful!
        <br />
        <br />
        {app ? app.name : 'The title'}{' '}
        {app && app.kind === 'media'
          ? `has been saved to ${mediaDestLabel(app)}.`
          : 'has been downloaded.'}
      </div>
      <OkToTitle shop={shop} app={app} />
      <div className="dots dots--bottom" />
      <PointsBadge points={shop.account.points} />
    </>
  );
}

export function DelConfirm({ shop }) {
  const { cur, goBack, replaceTop } = shop.nav;
  const { sfx, hover } = shop.audio;
  const app = shop.byId(cur.appId);
  if (!app) return null;
  return (
    <>
      <PageTitle black>Delete Title</PageTitle>
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
      <UnderBtn pos="l" label="Back" hover={hover} onClick={goBack} />
      <PointsBadge points={shop.account.points} />
      <UnderBtn
        pos="r"
        label="Delete"
        hover={hover}
        onClick={() => {
          sfx('decide');
          uninstallApp(shop.vfs, app, shop.userName);
          replaceTop({ screen: 'deldone', appId: app.id });
        }}
      />
    </>
  );
}

export function DelDone({ shop }) {
  const app = shop.byId(shop.nav.cur.appId);
  return (
    <>
      <PageTitle black>Delete Title</PageTitle>
      <div className="content">
        The title has been deleted.
        <br />
        <br />
        You can download it again from the shop at any time.
      </div>
      <OkToTitle shop={shop} app={app} />
      <div className="dots dots--bottom" />
      <PointsBadge points={shop.account.points} />
    </>
  );
}
