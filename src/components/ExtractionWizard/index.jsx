/*
 * The Compressed (zipped) Folders Extraction Wizard.
 *
 * Three pages, laid out and worded from ZIPFLDR dialogs 178, 162 and 163: a
 * welcome, a destination with a password box and a progress bar, and a done
 * page offering to show what came out. The banner down the left is the DLL's
 * own bitmap 164.
 */
import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

import XPDialogFrame from '../XPDialogFrame';
import XPButton from '../XPButton';
import banner from 'assets/windowsIcons/zipfldr-wizard.png';

/*
 * Sized from the resource rather than by eye: dialogs 162/163/178 are 260x138
 * dialog units, which at 8pt MS Shell Dlg is 390x225 pixels, and each places
 * the watermark at [0,0,78,138] — 117x225, exactly bitmap 164's own size. So
 * the picture fills the left column with nothing left over.
 */
const Body = styled.div`
  width: 390px;
  font-size: 11px;
  color: #000;

  .zw__page {
    display: flex;
    height: 225px;
  }
  .zw__banner {
    flex: none;
    width: 117px;
    background: #fff url(${banner}) no-repeat left top;
  }
  }
  .zw__main {
    flex: 1;
    min-width: 0;
    padding: 12px 14px;
    overflow: auto;
  }
  .zw__welcome h1 {
    margin: 2px 0 14px;
    font-size: 14px;
    font-weight: bold;
  }
  .zw__welcome p,
  .zw__main > p {
    margin: 0 0 12px;
    line-height: 15px;
  }
  .zw__label {
    margin: 0 0 4px;
  }
  .zw__row {
    display: flex;
    gap: 6px;
    margin-bottom: 14px;
  }
  .zw__row input {
    flex: 1;
    min-width: 0;
    height: 19px;
    padding: 0 3px;
    border: 1px solid var(--xp-select-border, #7f9db9);
    font-family: inherit;
    font-size: 11px;
  }
  .zw__progress {
    height: 14px;
    margin-top: 6px;
    padding: 1px;
    border: 1px solid var(--xp-select-border, #7f9db9);
    background: #fff;
  }
  .zw__progress span {
    display: block;
    height: 100%;
    background: repeating-linear-gradient(
      to right,
      #3f9c3f 0 8px,
      transparent 8px 10px
    );
  }
  .zw__status {
    margin-top: 6px;
    color: #333;
  }
  .zw__dest {
    margin: 4px 0 18px;
    font-weight: bold;
    word-break: break-all;
  }
  .zw__check {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 14px;
  }
  .zw__check input {
    margin: 0;
  }
  .zw__buttons {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    padding: 10px 12px;
    border-top: 1px solid #d5d2ca;
    background: var(--xp-face, #ece9d8);
  }
  .zw__error {
    color: #a00;
    margin: 0 0 10px;
  }
`;

/**
 * `onExtract(destination, password, onProgress)` does the work and resolves
 * with { extracted, skipped } or throws; the wizard only drives the pages.
 */
export default function ExtractionWizard({
  archiveName,
  defaultDestination,
  onExtract,
  onShowFiles,
  onClose,
}) {
  const [page, setPage] = useState('welcome');
  // Shown the way Windows writes a path; taken back either way
  const [destination, setDestination] = useState(() =>
    String(defaultDestination || '').replace(/\//g, '\\'),
  );
  const asPath = value => value.trim().replace(/\\/g, '/');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [problem, setProblem] = useState('');
  const [show, setShow] = useState(true);
  const [result, setResult] = useState(null);
  const destRef = useRef(null);

  useEffect(() => {
    if (page === 'where' && destRef.current) destRef.current.focus();
  }, [page]);

  const run = async () => {
    setBusy(true);
    setProblem('');
    try {
      const out = await onExtract(asPath(destination), password, setStatus);
      setResult(out);
      setPage('done');
    } catch (err) {
      setProblem(
        err.message || 'An error occurred while performing this operation.',
      );
    } finally {
      setBusy(false);
      setStatus('');
    }
  };

  return (
    <XPDialogFrame
      title="Extraction Wizard"
      onClose={busy ? undefined : onClose}
      width={392}
    >
      <Body>
        {page === 'welcome' && (
          <div className="zw__page">
            <div className="zw__banner" />
            <div className="zw__main zw__welcome">
              <h1>
                Welcome to the Compressed (zipped) Folders Extraction Wizard
              </h1>
              <p>
                The extraction wizard helps you copy files from inside a ZIP
                archive.
              </p>
              <p>To continue, click Next.</p>
            </div>
          </div>
        )}

        {page === 'where' && (
          <div className="zw__page">
            <div className="zw__banner" />
            <div className="zw__main">
              <p>
                <b>Select a folder to extract files to.</b>
              </p>
              <div className="zw__label">
                Files will be extracted to this directory:
              </div>
              <div className="zw__row">
                <input
                  ref={destRef}
                  value={destination}
                  spellCheck={false}
                  disabled={busy}
                  onChange={e => setDestination(e.target.value)}
                />
              </div>
              <div className="zw__label">
                If this Compressed (zipped) Folder contains any password
                protected files, please provide the password:
              </div>
              <div className="zw__row">
                <input
                  type="password"
                  value={password}
                  disabled={busy}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
              {problem && <p className="zw__error">{problem}</p>}
              {busy && (
                <>
                  <div className="zw__label">Extracting...</div>
                  <div className="zw__progress">
                    <span />
                  </div>
                  <div className="zw__status">{status}</div>
                </>
              )}
            </div>
          </div>
        )}

        {page === 'done' && (
          <div className="zw__page">
            <div className="zw__banner" />
            <div className="zw__main">
              <p>
                <b>Files have been successfully extracted</b>
                <br />
                to the following directory:
              </p>
              <div className="zw__dest">{destination}</div>
              {result && result.skipped > 0 && (
                <p>
                  {result.skipped} file
                  {result.skipped === 1 ? ' was' : 's were'} skipped.
                </p>
              )}
              <p>To see your extracted files, check the box below:</p>
              <label className="zw__check">
                <input
                  type="checkbox"
                  checked={show}
                  onChange={e => setShow(e.target.checked)}
                />
                <span>Show extracted files</span>
              </label>
              <p>Press finish to continue.</p>
            </div>
          </div>
        )}

        <div className="zw__buttons">
          <XPButton
            disabled={page === 'welcome' || busy || page === 'done'}
            onClick={() => setPage('welcome')}
          >
            &lt; Back
          </XPButton>
          {page === 'done' ? (
            <XPButton
              onClick={() => {
                if (show && onShowFiles) onShowFiles(asPath(destination));
                onClose();
              }}
            >
              Finish
            </XPButton>
          ) : (
            <XPButton
              disabled={busy || (page === 'where' && !destination.trim())}
              onClick={() => (page === 'welcome' ? setPage('where') : run())}
            >
              {page === 'welcome' ? 'Next >' : 'Extract'}
            </XPButton>
          )}
          <XPButton disabled={busy} onClick={onClose}>
            Cancel
          </XPButton>
        </div>
      </Body>
    </XPDialogFrame>
  );
}


