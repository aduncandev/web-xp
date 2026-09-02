import React from 'react';
import styled from 'styled-components';

import XPDialogFrame from '../XPDialogFrame';
import XPButton from '../XPButton';
import { listUsers, getCurrentUserName } from '../../context/users';
import { getArt } from '../../xpArt';

/**
 * About Windows (winver), reached from Help > About Windows in Explorer
 * windows. Layout and strings per refkit/shots/realxp/about-windows.png;
 * the banner (logo, copyright, Microsoft wordmark, orange rule) is the
 * genuine bitmap cropped from that ground-truth shot.
 */
export default function AboutWindows({ onClose }) {
  const banner = getArt('AboutBanner', null);
  const licensee =
    (listUsers()[0] || {}).name || getCurrentUserName() || 'Owner';

  return (
    <XPDialogFrame
      title="About Windows"
      width={419}
      onClose={onClose}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === 'Escape') onClose();
      }}
    >
      <Body>
        {banner && (
          <img className="aw__banner" src={banner} alt="" draggable={false} />
        )}
        <div className="aw__text">
          <div>Microsoft &reg; Windows</div>
          <div>
            Version 5.1 (Build 2600.xpsp_sp2_rtm.040803-2158 : Service Pack 2)
          </div>
          <div>Copyright &copy; 1981-2001 Microsoft Corporation</div>
          <div className="aw__gap" />
          <div>
            This product is licensed under the terms of the
            <br />
            <span className="aw__link">End-User License Agreement</span> to:
          </div>
          <div className="aw__licensee">
            <div>{licensee}</div>
            <div>&nbsp;</div>
          </div>
          <div className="aw__rule" />
          <div className="aw__mem">
            <span>Physical memory available to Windows:</span>
            <span>523,760 KB</span>
          </div>
        </div>
        <div className="aw__buttons">
          <XPButton onClick={onClose}>OK</XPButton>
        </div>
      </Body>
    </XPDialogFrame>
  );
}

const Body = styled.div`
  background: var(--xp-face, #ece9d8);
  font-family: Tahoma, 'Noto Sans', sans-serif;
  font-size: 11px;
  color: #000;
  user-select: none;

  .aw__banner {
    display: block;
    width: 100%;
  }
  /* Ref: text block indented under the banner wordmark (x~104) */
  .aw__text {
    padding: 10px 12px 0 104px;
    line-height: 15px;
  }
  .aw__gap {
    height: 14px;
  }
  .aw__link {
    color: #0026cb;
    text-decoration: underline;
  }
  .aw__licensee {
    margin: 8px 0 0 14px;
  }
  .aw__rule {
    height: 2px;
    margin: 8px 0 10px;
    border-top: 1px solid var(--xp-face-shadow, #aca899);
    border-bottom: 1px solid #ffffff;
  }
  .aw__mem {
    display: flex;
    gap: 16px;
  }
  .aw__buttons {
    display: flex;
    justify-content: flex-end;
    padding: 22px 14px 14px;
  }
`;
