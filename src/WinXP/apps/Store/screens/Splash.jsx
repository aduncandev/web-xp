// "Connecting. Please wait..." with the spinning ring, for a couple of
// seconds after the channel opens.
import { PageTitle } from '../parts';
import { ringImg, ringShadowImg } from '../art';

export default function Splash() {
  return (
    <>
      <PageTitle>XP Shop</PageTitle>
      <div className="splashmsg">Connecting. Please wait...</div>
      <div className="ringwrap ringwrap--spin">
        <img className="shadow" src={ringShadowImg} alt="" />
        <img className="ring" src={ringImg} alt="" />
      </div>
      <div className="dots dots--bottom" />
    </>
  );
}
