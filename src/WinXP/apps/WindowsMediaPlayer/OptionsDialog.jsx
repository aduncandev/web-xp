/*
 * Tools > Options.
 *
 * The real dialog carries eight tabs; this one carries the settings that
 * actually do something here, on the two pages they belong to. Adding the
 * rest as dead checkboxes would look more complete and be worth less.
 */
import React, { useState } from 'react';
import styled from 'styled-components';

import XPDialogFrame from '../../../components/XPDialogFrame';
import XPButton from '../../../components/XPButton';

const Body = styled.div`
  width: 380px;
  padding: 10px 12px 12px;
  font-size: 11px;
  color: #000;

  .wmp-opt__tabs {
    display: flex;
    gap: 2px;
    margin-bottom: -1px;
  }
  .wmp-opt__tab {
    padding: 3px 12px 4px;
    border: 1px solid #919b9c;
    border-bottom: none;
    border-radius: 3px 3px 0 0;
    background: linear-gradient(to bottom, #fff 0, var(--xp-face, #ece9d8) 100%);
    cursor: default;
  }
  .wmp-opt__tab--on {
    background: #fff;
    padding-bottom: 5px;
    position: relative;
    z-index: 1;
  }
  .wmp-opt__page {
    border: 1px solid #919b9c;
    background: #fff;
    padding: 12px;
    min-height: 150px;
  }
  .wmp-opt__lead {
    margin: 0 0 12px;
    color: #333;
  }
  label {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    margin-bottom: 10px;
    line-height: 14px;
  }
  input {
    margin: 0;
  }
  .wmp-opt__hint {
    color: #666;
    margin: -6px 0 12px 20px;
  }
  .wmp-opt__buttons {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 12px;
  }
`;

const TABS = ['Player', 'Media Library'];

export default function OptionsDialog({ options, onChange, onClose }) {
  const [tab, setTab] = useState('Player');
  const check = (key, label, hint) => (
    <>
      <label>
        <input
          type="checkbox"
          checked={!!options[key]}
          onChange={e => onChange(key, e.target.checked)}
        />
        <span>{label}</span>
      </label>
      {hint && <div className="wmp-opt__hint">{hint}</div>}
    </>
  );

  return (
    <XPDialogFrame title="Options" onClose={onClose} width={404}>
      <Body>
        <div className="wmp-opt__tabs">
          {TABS.map(name => (
            <div
              key={name}
              className={`wmp-opt__tab${
                tab === name ? ' wmp-opt__tab--on' : ''
              }`}
              onClick={() => setTab(name)}
            >
              {name}
            </div>
          ))}
        </div>
        <div className="wmp-opt__page">
          {tab === 'Player' ? (
            <>
              <p className="wmp-opt__lead">Customize Player settings.</p>
              {check(
                'startInMediaGuide',
                'Start player in Media Guide',
                'Opens the Media Guide instead of Now Playing.',
              )}
              {check(
                'showTitleBar',
                'Show the title above the video',
                'The artist and track name shown over Now Playing.',
              )}
            </>
          ) : (
            <>
              <p className="wmp-opt__lead">
                Choose what goes into your Media Library.
              </p>
              {check(
                'addPlayedToLibrary',
                'Add music files to Media Library when played',
                'Off by default, as it is in the real player — playing a file does not file it away.',
              )}
            </>
          )}
        </div>
        <div className="wmp-opt__buttons">
          <XPButton onClick={onClose}>OK</XPButton>
        </div>
      </Body>
    </XPDialogFrame>
  );
}
