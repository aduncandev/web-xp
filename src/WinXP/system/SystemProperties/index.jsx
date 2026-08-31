import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

import * as usersApi from '../../../context/users';
import XPButton from '../../../components/XPButton';
import XPSelect from '../../../components/XPSelect';
import { getArt } from '../../../xpArt';

import xpLogo from 'assets/windowsIcons/xplogo.png';
import computerIcon from 'assets/windowsIcons/676(32x32).png';
import diskIcon from 'assets/windowsIcons/334(32x32).png';

// Multiline tab control: the row holding the active tab always renders
// against the page, exactly like the real SP2 property sheet.
const TAB_GROUPS = [
  ['General', 'Computer Name', 'Hardware', 'Advanced'],
  ['System Restore', 'Automatic Updates', 'Remote'],
];

const COMPUTER_NAME = 'SKILLZ-XP';
const PRODUCT_ID = '55274-640-1011873-23081';

const safe = (fn, fallback) => {
  try {
    return typeof fn === 'function' ? fn() : fallback;
  } catch {
    return fallback;
  }
};

export default function SystemProperties({ onClose, onSetHeader }) {
  const [tab, setTab] = useState('General');

  useEffect(() => {
    if (onSetHeader) onSetHeader({ title: 'System Properties' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The machine's registered owner: the account created during OOBE setup
  const registeredTo = safe(() => {
    const first = (usersApi.listUsers()[0] || {}).name;
    return first || usersApi.getCurrentUserName();
  }, null);

  const rows = TAB_GROUPS[0].includes(tab)
    ? [TAB_GROUPS[1], TAB_GROUPS[0]]
    : [TAB_GROUPS[0], TAB_GROUPS[1]];

  return (
    <Root>
      <div className="sp__tabs">
        {rows.map((row, i) => (
          <div className="sp__tabrow" key={row[0]}>
            {row.map(t => (
              <div
                key={t}
                className={t === tab ? 'sp__tab sp__tab--active' : 'sp__tab'}
                onClick={() => setTab(t)}
              >
                {t}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="sp__page">
        {tab === 'General' && (
          <div className="sp__general">
            <div className="sp__gen-left">
              {/* The General-tab graphic: the genuine CRT bitmap with the
                  real flag composed onto a whitened screen (a dropped-in
                  sysdm-general.png would override the composition) */}
              {getArt('sysdm-general', null) ? (
                <img
                  src={getArt('sysdm-general', null)}
                  alt=""
                  width={158}
                  draggable={false}
                />
              ) : getArt('DisplayMonitor', null) ? (
                <div className="sp__monitor">
                  <img
                    src={getArt('DisplayMonitor', null)}
                    alt=""
                    width={158}
                    height={142}
                    draggable={false}
                  />
                  <div className="sp__monitor-screen">
                    <div className="sp__monitor-flag" />
                  </div>
                </div>
              ) : (
                <div className="sp__flag" />
              )}
            </div>
            <div className="sp__gen-right">
              <div className="sp__section">
                <div>System:</div>
                <div className="sp__indent">Microsoft Windows XP</div>
                <div className="sp__indent">Professional</div>
                <div className="sp__indent">Version 2002</div>
                <div className="sp__indent">Service Pack 2</div>
              </div>
              <div className="sp__section">
                <div>Registered to:</div>
                {registeredTo && (
                  <div className="sp__indent">{registeredTo}</div>
                )}
                {/* the empty organization line real XP leaves blank */}
                <div className="sp__indent">&nbsp;</div>
                <div className="sp__indent">{PRODUCT_ID}</div>
              </div>
              <div className="sp__section sp__section--computer">
                <div>Computer:</div>
                <div className="sp__indent">Intel(R) Pentium(R) 4 CPU</div>
                <div className="sp__indent">2.40GHz</div>
                <div className="sp__indent">2.39 GHz, 512 MB of RAM</div>
              </div>
            </div>
          </div>
        )}

        {tab === 'Computer Name' && (
          <>
            <div className="sp__introrow">
              <img src={computerIcon} alt="" width={32} height={32} />
              <span>
                Windows uses the following information to identify your computer
                on the network.
              </span>
            </div>
            <div className="sp__fieldrow">
              <span className="sp__fieldlabel">Computer description:</span>
              <input className="sp__input" type="text" defaultValue="" />
            </div>
            <div className="sp__hintrow">
              For example: &quot;Kitchen Computer&quot; or &quot;Mary&apos;s
              Computer&quot;.
            </div>
            <div className="sp__fieldrow sp__fieldrow--static">
              <span className="sp__fieldlabel">Full computer name:</span>
              <span>{COMPUTER_NAME}.</span>
            </div>
            <div className="sp__fieldrow sp__fieldrow--static">
              <span className="sp__fieldlabel">Workgroup:</span>
              <span>WORKGROUP</span>
            </div>
            <div className="sp__actionrow">
              <span className="sp__actiontext">
                To use the Network Identification Wizard to join a domain and
                create a local user account, click Network ID.
              </span>
              <XPButton disabled>Network ID</XPButton>
            </div>
            <div className="sp__actionrow">
              <span className="sp__actiontext">
                To rename this computer or join a domain, click Change.
              </span>
              <XPButton disabled>Change...</XPButton>
            </div>
          </>
        )}

        {tab === 'Hardware' && (
          <>
            <div className="sp__group">
              <div className="sp__group-title">Device Manager</div>
              <div className="sp__grouptext">
                The Device Manager lists all the hardware devices installed on
                your computer. Use the Device Manager to change the properties
                of any device.
              </div>
              <div className="sp__groupbuttons">
                <XPButton disabled>Device Manager</XPButton>
              </div>
            </div>
            <div className="sp__group">
              <div className="sp__group-title">Drivers</div>
              <div className="sp__grouptext">
                Driver Signing lets you make sure that installed drivers are
                compatible with Windows. Windows Update lets you set up how
                Windows connects to Windows Update for drivers.
              </div>
              <div className="sp__groupbuttons">
                <XPButton disabled>Driver Signing</XPButton>
                <XPButton disabled>Windows Update</XPButton>
              </div>
            </div>
            <div className="sp__group">
              <div className="sp__group-title">Hardware Profiles</div>
              <div className="sp__grouptext">
                Hardware profiles provide a way for you to set up and store
                different hardware configurations.
              </div>
              <div className="sp__groupbuttons">
                <XPButton disabled>Hardware Profiles</XPButton>
              </div>
            </div>
          </>
        )}

        {tab === 'Advanced' && (
          <>
            <div className="sp__toptext">
              You must be logged on as an Administrator to make most of these
              changes.
            </div>
            <div className="sp__group">
              <div className="sp__group-title">Performance</div>
              <div className="sp__grouptext">
                Visual effects, processor scheduling, memory usage, and virtual
                memory
              </div>
              <div className="sp__groupbuttons">
                <XPButton disabled>Settings</XPButton>
              </div>
            </div>
            <div className="sp__group">
              <div className="sp__group-title">User Profiles</div>
              <div className="sp__grouptext">
                Desktop settings related to your logon
              </div>
              <div className="sp__groupbuttons">
                <XPButton disabled>Settings</XPButton>
              </div>
            </div>
            <div className="sp__group">
              <div className="sp__group-title">Startup and Recovery</div>
              <div className="sp__grouptext">
                System startup, system failure, and debugging information
              </div>
              <div className="sp__groupbuttons">
                <XPButton disabled>Settings</XPButton>
              </div>
            </div>
            <div className="sp__groupbuttons sp__groupbuttons--page">
              <XPButton disabled>Environment Variables</XPButton>
              <XPButton disabled>Error Reporting</XPButton>
            </div>
          </>
        )}

        {tab === 'System Restore' && (
          <>
            <div className="sp__toptext">
              System Restore can track and reverse harmful changes to your
              computer.
            </div>
            <label className="sp__check">
              <input type="checkbox" defaultChecked={false} />
              Turn off System Restore on all drives
            </label>
            <div className="sp__group sp__group--fill">
              <div className="sp__group-title">Drive settings</div>
              <div className="sp__grouptext">
                To change the status of System Restore or the maximum amount of
                disk space available to System Restore on a drive, select the
                drive, and then click Settings.
              </div>
              <div className="sp__fieldrow sp__fieldrow--static">
                <span>Available drives:</span>
              </div>
              <div className="sp__driverow">
                <div className="sp__drivelist">
                  <div className="sp__drivelist-header">
                    <span className="sp__drivecol">Drive</span>
                    <span>Status</span>
                  </div>
                  <div className="sp__drivelist-item sp__drivelist-item--sel">
                    <span className="sp__drivecol">
                      <img src={diskIcon} alt="" width={16} height={16} />
                      (C:)
                    </span>
                    <span>Monitoring</span>
                  </div>
                </div>
                <div className="sp__drivebuttons">
                  <XPButton disabled>Settings...</XPButton>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'Automatic Updates' && (
          <>
            <div className="sp__toptext">
              Windows can regularly check for important updates and install them
              for you. (Turning on Automatic Updates may automatically update
              Windows Update software first, before any other updates.)
            </div>
            <div className="sp__linkrow">
              <span className="sp__link">How does Automatic Updates work?</span>
            </div>
            <label className="sp__radio sp__radio--bold">
              <input type="radio" name="sp-au" defaultChecked />
              Automatic (recommended)
            </label>
            <div className="sp__au-sub">
              <div>
                Automatically download recommended updates for my computer and
                install them:
              </div>
              <div className="sp__au-when">
                <XPSelect
                  className="sp__au-select"
                  options={[{ value: 'Every day', label: 'Every day' }]}
                  value="Every day"
                />
                <span>at</span>
                <XPSelect
                  className="sp__au-select sp__au-select--time"
                  options={[{ value: '3:00 AM', label: '3:00 AM' }]}
                  value="3:00 AM"
                />
              </div>
            </div>
            <label className="sp__radio">
              <input type="radio" name="sp-au" />
              Download updates for me, but let me choose when to install them.
            </label>
            <label className="sp__radio">
              <input type="radio" name="sp-au" />
              Notify me but don&apos;t automatically download or install them.
            </label>
            <label className="sp__radio">
              <input type="radio" name="sp-au" />
              Turn off Automatic Updates.
            </label>
            <div className="sp__au-sub sp__au-sub--warn">
              Your computer will be more vulnerable unless you install updates
              regularly. Install updates from the{' '}
              <span className="sp__link">Windows Update Web site</span>.
            </div>
            <div className="sp__linkrow sp__linkrow--bottom">
              <span className="sp__link">
                Offer updates again that I&apos;ve previously hidden
              </span>
            </div>
          </>
        )}

        {tab === 'Remote' && (
          <>
            <div className="sp__introrow sp__introrow--tight">
              <img src={computerIcon} alt="" width={32} height={32} />
              <span>
                Select the ways that this computer can be used from another
                location.
              </span>
            </div>
            <div className="sp__group sp__group--tight">
              <div className="sp__group-title">Remote Assistance</div>
              <label className="sp__check">
                <input type="checkbox" defaultChecked />
                Allow Remote Assistance invitations to be sent from this
                computer
              </label>
              <div className="sp__linkrow">
                <span className="sp__link">What is Remote Assistance?</span>
              </div>
              <div className="sp__groupbuttons">
                <XPButton disabled>Advanced...</XPButton>
              </div>
            </div>
            <div className="sp__group sp__group--tight">
              <div className="sp__group-title">Remote Desktop</div>
              <label className="sp__check">
                <input type="checkbox" defaultChecked={false} />
                Allow users to connect remotely to this computer
              </label>
              <div className="sp__grouptext">
                Full computer name:
                <br />
                {COMPUTER_NAME}
              </div>
              <div className="sp__linkrow">
                <span className="sp__link">What is Remote Desktop?</span>
              </div>
              <div className="sp__groupbuttons">
                <XPButton disabled>Select Remote Users...</XPButton>
              </div>
            </div>
            <div className="sp__toptext sp__toptext--note">
              For users to connect remotely to this computer, the user account
              must have a password.
            </div>
          </>
        )}
      </div>

      <div className="sp__buttons">
        <XPButton onClick={onClose}>OK</XPButton>
        <XPButton onClick={onClose}>Cancel</XPButton>
        <XPButton disabled>Apply</XPButton>
      </div>
    </Root>
  );
}

const Root = styled.div`
  position: absolute;
  inset: 0;
  background: #ece9d8;
  font-family: Tahoma, 'Noto Sans', sans-serif;
  font-size: 11px;
  display: flex;
  flex-direction: column;
  padding: 8px 8px 10px;
  user-select: none;

  .sp__tabs {
    display: flex;
    flex-direction: column;
    padding: 0 2px;
    position: relative;
    top: 1px;
    flex-shrink: 0;
  }
  .sp__tabrow {
    display: flex;
  }
  .sp__tab {
    flex: 1;
    text-align: center;
    padding: 3px 4px 3px;
    border: 1px solid #919b9c;
    border-bottom: none;
    border-radius: 3px 3px 0 0;
    background: linear-gradient(to bottom, #fefefd, #ece9d8);
    cursor: default;
    white-space: nowrap;
    overflow: hidden;
  }
  .sp__tab--active {
    background: #fdfdfa;
    position: relative;
    z-index: 2;
    border-top: 2px solid #e68b2c;
    padding-top: 2px;
    margin-bottom: -1px;
    padding-bottom: 4px;
  }
  .sp__page {
    flex: 1;
    border: 1px solid #919b9c;
    background: #fdfdfa;
    padding: 12px 14px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  /* --- General --- */
  .sp__general {
    display: flex;
    flex: 1;
    min-height: 0;
  }
  .sp__gen-left {
    flex: 0 0 172px;
    padding-top: 4px;
  }
  /* The genuine Windows XP flag, shown from the real logo art */
  .sp__flag {
    width: 128px;
    height: 107px;
    background: url(${xpLogo}) -90px 0 no-repeat;
  }
  /* Real CRT bitmap with the flag centered on a whitened screen */
  .sp__monitor {
    position: relative;
    width: 158px;
  }
  .sp__monitor img {
    display: block;
  }
  /* Glass rect of the 182x164 bitmap, scaled by 158/182 — oversized a
     couple of pixels so no baked-in desktop blue peeks out at the rim */
  .sp__monitor-screen {
    position: absolute;
    left: 10px;
    top: 14px;
    width: 136px;
    height: 100px;
    border-radius: 2px;
    background: #fbfbfb;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  /* xplogo.png flag region at 0.78 scale, trimmed shy of the orange "xp"
     glyph at the sheet's right edge */
  .sp__monitor-flag {
    width: 97px;
    height: 80px;
    background: url(${xpLogo}) no-repeat;
    background-size: 192px auto;
    background-position: -70px 0;
  }
  .sp__gen-right {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding-top: 4px;
  }
  .sp__section {
    margin-bottom: 16px;
    line-height: 16px;
  }
  .sp__section--computer {
    margin-top: auto;
    margin-bottom: 10px;
  }
  .sp__indent {
    padding-left: 16px;
  }

  /* --- Shared pieces --- */
  .sp__introrow {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin: 2px 0 14px;
    line-height: 13px;
  }
  .sp__introrow--tight {
    margin-bottom: 8px;
  }
  .sp__introrow img {
    flex-shrink: 0;
  }
  .sp__toptext {
    margin: 2px 0 10px;
    line-height: 13px;
  }
  .sp__toptext--note {
    margin-top: 2px;
    margin-bottom: 0;
  }
  .sp__fieldrow {
    display: flex;
    align-items: center;
    margin: 4px 0;
  }
  .sp__fieldrow--static {
    margin: 8px 0 0;
  }
  .sp__fieldlabel {
    flex: 0 0 128px;
  }
  .sp__input {
    flex: 1;
    height: 19px;
    border: 1px solid #7f9db9;
    background: #fff;
    font-family: Tahoma, 'Noto Sans', sans-serif;
    font-size: 11px;
    padding: 1px 3px;
  }
  .sp__hintrow {
    padding-left: 128px;
    color: #000;
    margin-bottom: 6px;
    line-height: 13px;
  }
  .sp__actionrow {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-top: 14px;
  }
  .sp__actiontext {
    flex: 1;
    line-height: 13px;
  }
  .sp__group {
    border: 1px solid #d0cdb9;
    border-radius: 3px;
    padding: 8px 10px 10px;
    margin-bottom: 12px;
  }
  .sp__group--tight {
    padding: 6px 10px 8px;
    margin-bottom: 8px;
    .sp__check {
      margin-bottom: 4px;
    }
    .sp__linkrow {
      margin-bottom: 5px;
    }
  }
  .sp__group--fill {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .sp__group-title {
    color: #003399;
    margin-bottom: 4px;
  }
  .sp__grouptext {
    line-height: 13px;
    margin-bottom: 6px;
  }
  .sp__groupbuttons {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  }
  .sp__groupbuttons--page {
    margin-top: auto;
    padding-top: 4px;
  }
  .sp__check {
    display: flex;
    align-items: flex-start;
    gap: 5px;
    margin: 4px 0 8px;
    line-height: 13px;
    input {
      flex-shrink: 0;
      margin: 0;
    }
  }
  .sp__radio {
    display: flex;
    align-items: flex-start;
    gap: 5px;
    margin: 5px 0;
    line-height: 13px;
    input {
      flex-shrink: 0;
      margin: 0;
    }
  }
  .sp__radio--bold {
    font-weight: 700;
  }
  .sp__link {
    color: #0066cc;
    text-decoration: underline;
    cursor: pointer;
  }
  .sp__linkrow {
    margin: 2px 0 8px;
  }
  .sp__linkrow--bottom {
    margin-top: auto;
    margin-bottom: 0;
  }

  /* --- System Restore --- */
  .sp__driverow {
    display: flex;
    gap: 8px;
    margin-top: 4px;
    flex: 1;
    min-height: 0;
  }
  .sp__drivelist {
    flex: 1;
    border: 1px solid #7f9db9;
    background: #fff;
    overflow-y: auto;
    align-self: stretch;
    min-height: 64px;
  }
  .sp__drivelist-header {
    display: flex;
    border-bottom: 1px solid #d0cdb9;
    background: #ece9d8;
    span {
      padding: 1px 4px;
    }
  }
  .sp__drivecol {
    flex: 0 0 96px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .sp__drivelist-item {
    display: flex;
    span {
      padding: 1px 4px;
    }
  }
  .sp__drivelist-item--sel {
    background: #316ac5;
    color: #fff;
  }
  .sp__drivebuttons {
    flex-shrink: 0;
  }

  /* --- Automatic Updates --- */
  .sp__au-sub {
    padding-left: 18px;
    margin: 2px 0 6px;
    line-height: 13px;
  }
  .sp__au-when {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
  }
  .sp__au-select {
    min-width: 110px;
  }
  .sp__au-select--time {
    min-width: 80px;
  }
  .sp__au-sub--warn {
    margin-bottom: 10px;
  }

  .sp__buttons {
    flex-shrink: 0;
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    padding-top: 8px;
  }
`;

