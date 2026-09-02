// A title's page (B_05): the Details panel with its photo well, the buy
// button, and Delete Title once it is installed.
import { mediaFileUrls } from '../catalog';
import { SHELVES } from '../constants';
import { launchTarget, launchVerb, priceLabel } from '../catalogView';
import { BackFooter, PageTitle, UnderBtn } from '../parts';

/** Picture packs page through their images; everything else shows its icon. */
function Photo({ shop, app }) {
  const { sfx, hover } = shop.audio;
  const { previewIdx, setPreviewIdx } = shop.ui;
  const gallery =
    app.kind === 'media' && app.dest === 'pictures' && app.files.length > 0
      ? mediaFileUrls(app)
      : null;
  if (!gallery) return <img src={app.icon} alt="" />;
  const idx = ((previewIdx % gallery.length) + gallery.length) % gallery.length;
  const step = (dir, d) => (
    <button
      className={`details__pv details__pv--${dir}`}
      onMouseEnter={hover}
      onClick={() => {
        sfx('decide');
        setPreviewIdx(i => i + d);
      }}
    >
      {dir === 'l' ? '‹' : '›'}
    </button>
  );
  return (
    <>
      <img className="b05__shot" src={gallery[idx]} alt="" />
      {gallery.length > 1 && (
        <>
          {step('l', -1)}
          {step('r', 1)}
          <span className="details__pvcount">
            {idx + 1}/{gallery.length}
          </span>
        </>
      )}
    </>
  );
}

export default function TitlePage({ shop }) {
  const { cur, go } = shop.nav;
  const { sfx, hover } = shop.audio;
  const app = shop.byId(cur.appId);
  if (!app) return null;
  return (
    <>
      <PageTitle black>Details</PageTitle>
      <div className="b05">
        <div className="b05__shelf">{SHELVES[app.shelf].label}</div>
        <div className="b05__photo">
          <Photo shop={shop} app={app} />
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
            const target = launchTarget(app, shop.userName);
            if (shop.onShellOpen && target) shop.onShellOpen(target);
          }}
        >
          <span className="buybtn__act">{launchVerb(app)}</span>
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
      <BackFooter
        shop={shop}
        right={
          app.installed ? (
            <UnderBtn
              pos="r"
              label="Delete Title"
              hover={hover}
              onClick={() => {
                sfx('decide');
                go('delconfirm', { appId: app.id });
              }}
            />
          ) : null
        }
      />
    </>
  );
}
