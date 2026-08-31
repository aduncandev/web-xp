/*
 * Guest Book — the one part of this desktop that talks to a real server.
 *
 * Everything else here is local: files live in IndexedDB, settings live in a
 * ntuser.dat, nothing leaves the machine. This does, because a guest book
 * that only you can see is a text file. The backend lives in
 * `server/guestbook/` and holds the filtering and moderation; this is the
 * window onto it.
 *
 * Two things about the display are deliberate rather than incidental:
 *
 * - Entries render as plain text. Nothing is parsed as markup and a URL is
 *   never turned into a link, which removes the entire reason anyone spams a
 *   guest book. React escapes by default; the point is that no code here
 *   un-escapes anything.
 * - A held entry and a blocked one look identical to whoever sent it. The
 *   server says "will appear once reviewed" either way, because telling a
 *   spammer their payload was recognised is free tuning data for them.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import styled from 'styled-components';

import { WindowDropDowns } from 'components';
import XPButton from '../../../components/XPButton';
import { useDialog } from '../../../context/DialogContext';
import { PRIVACY_SUMMARY } from '../../../privacyNotice';
import { api } from './api';
import Moderation from './Moderation';
import dropDownData from './dropDownData';

const NAME_LIMIT = 32;
const LOCATION_LIMIT = 40;
const MESSAGE_LIMIT = 800;

/*
 * Remembered per browser, not per XP account: the notice is about what
 * this site does with a submission, which does not change depending on
 * which desktop user is logged in.
 */
const NOTICE_KEY = 'guestbook_privacy_ack';

const noticeSeen = () => {
  try {
    return localStorage.getItem(NOTICE_KEY) === '1';
  } catch {
    // Private mode: show it every time rather than never.
    return false;
  }
};

const rememberNotice = () => {
  try {
    localStorage.setItem(NOTICE_KEY, '1');
  } catch {
    /* nothing to be done; the notice simply shows again */
  }
};

function formatDate(ms) {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function GuestBook({ onClose }) {
  const { alert, confirm } = useDialog();
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [oldestFirst, setOldestFirst] = useState(false);

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(null);
  const [result, setResult] = useState(null);
  const [formError, setFormError] = useState(null);

  const [moderating, setModerating] = useState(false);

  /*
   * When the form was drawn. The server refuses anything returned faster than
   * a person could have read the page, which costs a scripted post nothing to
   * defeat on its own but stacks with the rest.
   */
  const renderedAt = useRef(Date.now());
  /* Never filled by a person; filled by most naive scrapers. */
  const honeypot = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.listEntries(100, 0);
      setEntries(data.entries || []);
      setTotal(data.total ?? data.entries?.length ?? 0);
    } catch (err) {
      setLoadError(
        err.message === 'Failed to fetch'
          ? 'Could not reach the guest book server.'
          : err.message,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => {
    const list = [...entries];
    return oldestFirst ? list.reverse() : list;
  }, [entries, oldestFirst]);

  const remaining = MESSAGE_LIMIT - message.length;

  async function onSign(e) {
    e.preventDefault();
    if (busy) return;
    setFormError(null);
    setResult(null);

    if (!name.trim()) return setFormError('Please enter a name.');
    if (!message.trim()) return setFormError('Please enter a message.');

    /*
     * The privacy notice, at the one moment it is relevant: the first time
     * this browser tries to send something to the server. Not a banner on
     * arrival — most visitors never sign, and telling them about data
     * collection that will never happen is noise. Cancel backs out with the
     * message still in the box.
     */
    if (!noticeSeen()) {
      const goAhead = await confirm(
        PRIVACY_SUMMARY,
        'Before you sign',
        { icon: 'info' },
      );
      if (!goAhead) return;
      rememberNotice();
    }

    setBusy('Preparing...');
    try {
      const response = await api.sign({
        name: name.trim(),
        location: location.trim(),
        message: message.trim(),
        renderedAt: renderedAt.current,
        website: honeypot.current?.value || '',
        onProgress: setBusy,
      });

      if (response.status === 'published') {
        setResult({ kind: 'published', text: 'Thanks for signing!' });
        setEntries(prev => [response.entry, ...prev]);
        setTotal(n => n + 1);
      } else {
        setResult({
          kind: 'pending',
          text:
            response.message ||
            'Thanks! Your entry will appear once it has been reviewed.',
        });
      }
      setName('');
      setLocation('');
      setMessage('');
      renderedAt.current = Date.now();
    } catch (err) {
      setFormError(
        err.message === 'Failed to fetch'
          ? 'Could not reach the guest book server.'
          : err.message,
      );
    } finally {
      setBusy(null);
    }
  }

  function onMenuItem(item) {
    switch (item) {
      case 'Refresh':
        return load();
      case 'Moderate...':
        return setModerating(true);
      case 'Exit':
        return onClose?.();
      case 'Newest first':
        return setOldestFirst(false);
      case 'Oldest first':
        return setOldestFirst(true);
      case 'About Guest Book':
        return alert(
          [
            'Guest Book',
            '',
            `${total} ${total === 1 ? 'entry' : 'entries'} signed.`,
            '',
            'Entries are checked before they appear.',
            'Copyright (C) aduncan.dev',
          ].join('\n'),
          'About Guest Book',
          { icon: 'info' },
        );
      default:
    }
  }

  if (moderating) {
    return <Moderation onExit={() => { setModerating(false); load(); }} />;
  }

  return (
    <Div>
      <section className="gb__toolbar">
        <WindowDropDowns items={dropDownData} onClickItem={onMenuItem} />
      </section>

      <div className="gb__body">
        <div className="gb__list">
          {loading && <p className="gb__note">Loading entries...</p>}

          {loadError && (
            <div className="gb__error">
              <strong>{loadError}</strong>
              <p>
                The guest book needs its server running at{' '}
                <code>{api.base}</code>. Everything else on this desktop works
                offline; this is the one thing that does not.
              </p>
              <XPButton onClick={load}>Try Again</XPButton>
            </div>
          )}

          {!loading && !loadError && shown.length === 0 && (
            <p className="gb__note">
              Nobody has signed yet. Be the first.
            </p>
          )}

          {shown.map(entry => (
            <article className="gb__entry" key={entry.id}>
              <header>
                <span className="gb__name">{entry.name}</span>
                {entry.location && (
                  <span className="gb__from">from {entry.location}</span>
                )}
                <span className="gb__date">{formatDate(entry.createdAt)}</span>
              </header>
              {/* Plain text, always. No markup, no auto-linking. */}
              <p className="gb__message">{entry.message}</p>
              {entry.reply && (
                <div className="gb__reply">
                  <span className="gb__replyWho">Skillz replied:</span>
                  <p>{entry.reply}</p>
                </div>
              )}
            </article>
          ))}
        </div>

        <form className="gb__form" onSubmit={onSign}>
          <div className="gb__formTitle">Sign the guest book</div>

          <div className="gb__row">
            <label htmlFor="gb-name">Name:</label>
            <input
              id="gb-name"
              value={name}
              maxLength={NAME_LIMIT}
              onChange={e => setName(e.target.value)}
              autoComplete="off"
            />
            <label htmlFor="gb-from">From:</label>
            <input
              id="gb-from"
              value={location}
              maxLength={LOCATION_LIMIT}
              onChange={e => setLocation(e.target.value)}
              placeholder="optional"
              autoComplete="off"
            />
          </div>

          {/*
            The honeypot. Hidden from people by CSS and from screen readers by
            aria-hidden, left in the tab order's way with tabIndex -1. A
            scraper filling every input trips it; nobody else can.
          */}
          <input
            ref={honeypot}
            className="gb__hp"
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />

          <textarea
            value={message}
            maxLength={MESSAGE_LIMIT}
            onChange={e => setMessage(e.target.value)}
            placeholder="Leave a message..."
            spellCheck
          />

          <div className="gb__actions">
            <span className={remaining < 60 ? 'gb__count low' : 'gb__count'}>
              {remaining} characters left
            </span>
            {formError && <span className="gb__formError">{formError}</span>}
            {result && (
              <span className={`gb__result ${result.kind}`}>{result.text}</span>
            )}
            <XPButton type="submit" disabled={!!busy}>
              {busy || 'Sign'}
            </XPButton>
          </div>
        </form>
      </div>

      <footer className="gb__status">
        <div className="gb__cell grow">
          {loadError
            ? 'Offline'
            : `${total} ${total === 1 ? 'entry' : 'entries'}`}
        </div>
        <div className="gb__cell">
          {busy ? busy : 'Entries are checked before they appear'}
        </div>
      </footer>
    </Div>
  );
}

const Div = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ece9d8;
  font-family: Tahoma, 'Noto Sans', sans-serif;
  font-size: 11px;

  .gb__toolbar {
    position: relative;
    height: 20px;
    flex-shrink: 0;
    border-bottom: 1px solid #dfdfd4;
  }

  .gb__body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 3px;
    gap: 3px;
  }

  .gb__list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    background: #fff;
    border: 1px solid #7f9db9;
    padding: 6px 8px;
  }

  .gb__note {
    color: #666;
    padding: 10px 2px;
    font-style: italic;
  }

  .gb__error {
    padding: 10px;
    strong {
      display: block;
      margin-bottom: 6px;
      color: #a00;
    }
    p {
      margin: 0 0 10px;
      color: #444;
      line-height: 1.5;
    }
    code {
      font-family: 'Lucida Console', monospace;
      background: #f2f2f2;
      padding: 0 3px;
    }
  }

  .gb__entry {
    padding: 7px 0;
    border-bottom: 1px solid #e6e6e6;
    &:last-child {
      border-bottom: none;
    }
    header {
      margin-bottom: 3px;
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
    }
  }

  .gb__name {
    font-weight: bold;
    color: #0a246a;
  }
  .gb__from {
    /* The header is a flex row, so each span is a flex item and any
       leading space inside one is collapsed away. The gap has to be a
       margin; whitespace in the markup cannot do it. */
    margin-left: 4px;
    color: #666;
  }
  .gb__date {
    margin-left: auto;
    color: #888;
    padding-left: 10px;
  }

  .gb__message {
    margin: 0;
    line-height: 1.55;
    /* Entries are plain text; long unbroken strings must not stretch the pane. */
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .gb__reply {
    margin: 6px 0 2px 16px;
    padding: 5px 8px;
    background: #f4f6fb;
    border-left: 3px solid #7f9db9;
    p {
      margin: 2px 0 0;
      line-height: 1.5;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
  }
  .gb__replyWho {
    font-weight: bold;
    color: #0a246a;
  }

  .gb__form {
    flex-shrink: 0;
    border: 1px solid #aca899;
    background: #f6f5ee;
    padding: 6px 8px 8px;
  }

  .gb__formTitle {
    font-weight: bold;
    color: #0a246a;
    margin-bottom: 5px;
  }

  .gb__row {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-bottom: 5px;
    label {
      flex-shrink: 0;
    }
    input {
      flex: 1;
      min-width: 0;
    }
  }

  input[type='text'],
  .gb__row input,
  textarea {
    border: 1px solid #7f9db9;
    padding: 2px 3px;
    font-family: Tahoma, 'Noto Sans', sans-serif;
    font-size: 11px;
    background: #fff;
    &:focus {
      outline: none;
      border-color: #316ac5;
    }
  }

  textarea {
    width: 100%;
    height: 54px;
    resize: none;
    line-height: 1.45;
  }

  /* Off-screen rather than display:none — some bots skip hidden inputs. */
  .gb__hp {
    position: absolute;
    left: -9999px;
    width: 1px;
    height: 1px;
    opacity: 0;
  }

  .gb__actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
  }

  .gb__count {
    color: #777;
    &.low {
      color: #b06000;
    }
  }
  .gb__formError {
    color: #a00;
  }
  .gb__result {
    &.published {
      color: #1a7a1a;
    }
    &.pending {
      color: #9a6500;
    }
  }
  .gb__actions button {
    margin-left: auto;
  }

  .gb__status {
    flex-shrink: 0;
    height: 20px;
    display: flex;
    align-items: stretch;
    border-top: 1px solid #fff;
  }
  .gb__cell {
    display: flex;
    align-items: center;
    padding: 0 6px;
    border: 1px solid #dfdfd4;
    border-top-color: #aca899;
    border-left-color: #aca899;
    color: #333;
    &.grow {
      flex: 1;
    }
  }
`;

export default GuestBook;
