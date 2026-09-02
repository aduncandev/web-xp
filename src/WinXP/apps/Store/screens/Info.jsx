// The reading pages behind the Important Info panel: the shopping guide,
// a news item and the welcome note.
import { SHOP_NEWS } from '../catalog';
import { BackFooter, PageTitle } from '../parts';

export function Help({ shop }) {
  return (
    <>
      <PageTitle>Shopping Guide</PageTitle>
      <div className="content content--left">
        1. Pick a catalog from the Main Menu: Games, XPWare or Extras.
        <br />
        2. Choose a title to see its details.
        <br />
        3. Press <span className="blue">Download</span>. Software shows up in
        the Start menu under Shop Apps. Extras are saved into your own folders,
        like My Music.
        <br />
        <br />
        Deleting a title only removes it from this PC. You can download it
        again at any time.{' '}
        {shop.account.everFoundEgg
          ? 'Paid titles cost XP Points, which you can get by trading ' +
            'eggs on the Add XP Points page.'
          : 'Paid titles cost XP Points. The Add XP Points page ' +
            'explains how points are earned.'}
      </div>
      <BackFooter shop={shop} />
    </>
  );
}

export function News({ shop }) {
  const item = SHOP_NEWS.find(n => n.id === shop.nav.cur.newsId) || SHOP_NEWS[0];
  if (!item) return null;
  return (
    <>
      <PageTitle>Important Info</PageTitle>
      <div className="content content--left">
        <span className="blue">{item.title}</span>
        <br />
        <br />
        {item.body}
      </div>
      <BackFooter shop={shop} />
    </>
  );
}

export function Info({ shop }) {
  return (
    <>
      <PageTitle>Important Info</PageTitle>
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
      <BackFooter shop={shop} />
    </>
  );
}
