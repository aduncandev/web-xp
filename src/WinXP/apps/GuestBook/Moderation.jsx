/*
 * The moderation panel, reached from File > Moderate...
 *
 * Discord is the fast path for new arrivals — an entry lands, you get an
 * alert with buttons, you tap one. This is everything else: the backlog, the
 * already-published, the ban list, and reviewing what the filter *blocked* to
 * see whether it was right. False positives are invisible otherwise, which is
 * why "Publish anyway" sits on every blocked entry.
 *
 * On showing addresses: the token this screen holds already grants full
 * access to them through the API, so rendering one leaks nothing new. What it
 * does add is incidental exposure — a screenshot of the desktop with the
 * panel open. So the pseudonymous hash is what shows by default (it is what
 * bans match on anyway, and it is enough to tell two signers apart), and the
 * real address is one deliberate click away.
 *
 * The token lives in sessionStorage, so it is gone when the tab closes.
 */
import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import XPButton from '../../../components/XPButton';
import { useDialog } from '../../../context/DialogContext';
import { api } from './api';

const TOKEN_KEY = 'guestbook_admin_token';
const TABS = [
  ['pending', 'Waiting'],
  ['published', 'Published'],
  ['blocked', 'Blocked'],
  ['rejected', 'Rejected'],
  ['', 'All'],
  ['bans', 'Bans'],
];

const readToken = () => {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
};

const when = ms =>
  ms ? new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';

function Moderation({ onExit }) {
  const { confirm, prompt } = useDialog();
  const [token, setToken] = useState(readToken);
  const [draftToken, setDraftToken] = useState('');
  const [tab, setTab] = useState('pending');
  const [entries, setEntries] = useState([]);
  const [bans, setBans] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  /* Entry ids whose raw address the moderator has deliberately revealed. */
  const [revealed, setRevealed] = useState(() => new Set());

  const load = useCallback(
    async (currentToken = token, status = tab) => {
      if (!currentToken) return;
      setLoading(true);
      setError(null);
      try {
        if (status === 'bans') {
          const [banData, statData] = await Promise.all([
            api.bans(currentToken),
            api.adminStats(currentToken),
          ]);
          setBans(banData.bans || []);
          setStats(statData.stats || null);
        } else {
          const data = await api.adminEntries(currentToken, status);
          setEntries(data.entries || []);
          setStats(data.stats || null);
        }
      } catch (err) {
        if (err.status === 401) {
          setError('That token was not accepted.');
          setToken('');
          try {
            sessionStorage.removeItem(TOKEN_KEY);
          } catch {
            /* private mode */
          }
        } else {
          setError(
            err.message === 'Failed to fetch'
              ? 'Could not reach the guest book server.'
              : err.message,
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [token, tab],
  );

  useEffect(() => {
    if (token) load(token, tab);
  }, [token, tab, load]);

  function signIn(e) {
    e.preventDefault();
    const value = draftToken.trim();
    if (!value) return;
    try {
      sessionStorage.setItem(TOKEN_KEY, value);
    } catch {
      /* private mode: the token just lives in memory for this session */
    }
    setToken(value);
    setDraftToken('');
  }

  async function act(id, fn, confirmText) {
    if (confirmText && !(await confirm(confirmText, 'Guest Book'))) return;
    setBusyId(id);
    setError(null);
    try {
      const result = await fn();
      if (result && result.ok === false) setError(result.message);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  /*
   * Ban asks for a reason rather than just confirming. The reason is only
   * ever for you — it shows in the Bans tab and the Discord embed, and is
   * never sent to the person banned — but future-you will want to know why
   * a hash was blocked, and the moment to write that down is now.
   */
  async function banWithReason(entry) {
    const reason = await prompt(
      [
        `Ban the signer of entry #${entry.id}?`,
        '',
        'This also unpublishes their other entries. Anything they send',
        'afterwards is refused before it costs anything.',
        '',
        'Reason (optional, for your records):',
      ].join('\n'),
      '',
      'Ban signer',
    );
    // null means Cancel; an empty string means OK with no reason given.
    if (reason === null) return;
    await act(entry.id, () =>
      api.ban(token, entry.id, reason.trim() || undefined),
    );
  }

  async function submitReply(id) {
    setBusyId(id);
    try {
      await api.reply(token, id, replyText);
      setReplyTo(null);
      setReplyText('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const reveal = id =>
    setRevealed(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

  if (!token) {
    return (
      <Div>
        <form className="mod__signin" onSubmit={signIn}>
          <h2>Moderation</h2>
          <p>
            Paste the <code>ADMIN_TOKEN</code> from the server&rsquo;s
            environment. It is kept for this tab only.
          </p>
          {error && <p className="mod__error">{error}</p>}
          <input
            type="password"
            value={draftToken}
            onChange={e => setDraftToken(e.target.value)}
            placeholder="Admin token"
            autoFocus
          />
          <div className="mod__signinButtons">
            <XPButton type="submit">Unlock</XPButton>
            <XPButton type="button" onClick={onExit}>
              Back
            </XPButton>
          </div>
        </form>
      </Div>
    );
  }

  return (
    <Div>
      <div className="mod__bar">
        {TABS.map(([value, label]) => (
          <button
            key={value || 'all'}
            className={tab === value ? 'active' : ''}
            onClick={() => setTab(value)}
          >
            {label}
            {stats && value && value !== 'bans' && stats[value]
              ? ` (${stats[value]})`
              : ''}
          </button>
        ))}
        <div className="mod__spacer" />
        <XPButton onClick={() => load()}>Refresh</XPButton>
        <XPButton onClick={onExit}>Back</XPButton>
      </div>

      {error && <div className="mod__error bar">{error}</div>}

      <div className="mod__list">
        {loading && <p className="mod__note">Loading...</p>}

        {/* ---- bans ---- */}
        {!loading && tab === 'bans' && (
          <>
            {bans.length === 0 && <p className="mod__note">Nobody is banned.</p>}
            {bans.map(ban => (
              <article className="mod__entry" key={ban.ip_hash}>
                <header>
                  <span className="mod__status blocked">banned</span>
                  <code className="mod__hash">{ban.ip_hash}</code>
                  <span className="mod__meta">{when(ban.created_at)}</span>
                </header>
                <p className="mod__message">
                  {ban.reason || 'No reason recorded.'}
                  {ban.created_by ? ` — by ${ban.created_by}` : ''}
                </p>
                <div className="mod__actions">
                  <XPButton
                    disabled={busyId === ban.ip_hash}
                    onClick={() =>
                      act(
                        ban.ip_hash,
                        () => api.unban(token, ban.ip_hash),
                        `Lift the ban on ${ban.ip_hash.slice(0, 12)}? They will be able to sign again.`,
                      )
                    }
                  >
                    Unban
                  </XPButton>
                </div>
              </article>
            ))}
          </>
        )}

        {/* ---- entries ---- */}
        {!loading && tab !== 'bans' && entries.length === 0 && (
          <p className="mod__note">Nothing here.</p>
        )}

        {!loading &&
          tab !== 'bans' &&
          entries.map(entry => {
            const withheld = entry.redacted || entry.severity === 'csam';
            const shown = revealed.has(entry.id);
            return (
              <article className="mod__entry" key={entry.id}>
                <header>
                  <span className={`mod__status ${entry.status}`}>
                    {entry.status}
                  </span>
                  <strong>{entry.name}</strong>
                  {entry.location && <span> from {entry.location}</span>}
                  <span className="mod__meta">
                    #{entry.id} · score {entry.score} · {when(entry.created_at)}
                  </span>
                </header>

                <p className={`mod__message${withheld ? ' withheld' : ''}`}>
                  {withheld
                    ? 'Content withheld — this entry matched the highest-severity category, so its text was never stored.'
                    : entry.message}
                </p>

                <dl className="mod__facts">
                  <dt>Signer</dt>
                  <dd>
                    <code className="mod__hash">{entry.ip_hash}</code>
                    {shown ? (
                      <code className="mod__ip">
                        {entry.ip || 'address purged (past retention)'}
                      </code>
                    ) : (
                      <button
                        className="mod__linkBtn"
                        onClick={() => reveal(entry.id)}
                      >
                        show address
                      </button>
                    )}
                  </dd>

                  {entry.user_agent && (
                    <>
                      <dt>Agent</dt>
                      <dd className="mod__ua">{entry.user_agent}</dd>
                    </>
                  )}

                  {entry.reason && (
                    <>
                      <dt>Reason</dt>
                      <dd>{entry.reason}</dd>
                    </>
                  )}

                  {entry.moderated_by && (
                    <>
                      <dt>Actioned</dt>
                      <dd>
                        {entry.moderated_by} · {when(entry.moderated_at)}
                      </dd>
                    </>
                  )}
                </dl>

                {(entry.signals?.length > 0 || entry.classifier) && (
                  <div className="mod__signals">
                    {entry.signals?.map(s => (
                      <span className="mod__chip" key={s.id} title={s.detail || ''}>
                        {s.id} +{s.weight}
                      </span>
                    ))}
                    {entry.classifier?.available && (
                      <span className="mod__chip claude">
                        Claude: {entry.classifier.verdict}
                        {entry.classifier.reason
                          ? ` — ${entry.classifier.reason}`
                          : ''}
                      </span>
                    )}
                    {entry.classifier && !entry.classifier.available && (
                      <span className="mod__chip">
                        Claude unavailable ({entry.classifier.reason})
                      </span>
                    )}
                  </div>
                )}

                {entry.reply_text && (
                  <div className="mod__reply">Reply: {entry.reply_text}</div>
                )}

                {replyTo === entry.id ? (
                  <div className="mod__replyBox">
                    <textarea
                      value={replyText}
                      maxLength={500}
                      autoFocus
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Your reply, shown under the entry. Empty clears it."
                    />
                    <div className="mod__actions">
                      <XPButton
                        onClick={() => submitReply(entry.id)}
                        disabled={busyId === entry.id}
                      >
                        Save Reply
                      </XPButton>
                      <XPButton onClick={() => setReplyTo(null)}>Cancel</XPButton>
                    </div>
                  </div>
                ) : (
                  <div className="mod__actions">
                    {entry.status !== 'published' && !withheld && (
                      <XPButton
                        disabled={busyId === entry.id}
                        onClick={() =>
                          act(entry.id, () => api.approve(token, entry.id))
                        }
                      >
                        {entry.status === 'blocked' ? 'Publish anyway' : 'Approve'}
                      </XPButton>
                    )}
                    {entry.status === 'published' && (
                      <XPButton
                        disabled={busyId === entry.id}
                        onClick={() =>
                          act(entry.id, () => api.reject(token, entry.id))
                        }
                      >
                        Unpublish
                      </XPButton>
                    )}
                    {!withheld && (
                      <XPButton
                        disabled={busyId === entry.id}
                        onClick={() => {
                          setReplyTo(entry.id);
                          setReplyText(entry.reply_text || '');
                        }}
                      >
                        Reply
                      </XPButton>
                    )}
                    <XPButton
                      disabled={busyId === entry.id}
                      onClick={() => banWithReason(entry)}
                    >
                      Ban
                    </XPButton>
                    <XPButton
                      disabled={busyId === entry.id}
                      onClick={() =>
                        act(
                          entry.id,
                          () => api.remove(token, entry.id),
                          `Delete entry #${entry.id} permanently?`,
                        )
                      }
                    >
                      Delete
                    </XPButton>
                  </div>
                )}
              </article>
            );
          })}
      </div>

      <footer className="mod__status-bar">
        <div className="mod__cell grow">
          {stats
            ? `${stats.published} published · ${stats.pending} waiting · ` +
              `${stats.blocked} blocked · ${stats.rejected} rejected`
            : ''}
        </div>
        <div className="mod__cell">
          {tab === 'bans' ? `${bans.length} banned` : `${entries.length} shown`}
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

  .mod__signin {
    margin: auto;
    width: 300px;
    padding: 16px;
    text-align: left;
    h2 {
      font-size: 13px;
      color: #0a246a;
      margin: 0 0 8px;
    }
    p {
      margin: 0 0 10px;
      line-height: 1.5;
      color: #444;
    }
    code {
      font-family: 'Lucida Console', monospace;
      background: #f2f2f2;
      padding: 0 3px;
    }
    input {
      width: 100%;
      border: 1px solid #7f9db9;
      padding: 3px;
      font-family: Tahoma, 'Noto Sans', sans-serif;
      font-size: 11px;
    }
  }
  .mod__signinButtons {
    display: flex;
    gap: 6px;
    margin-top: 10px;
    justify-content: flex-end;
  }

  .mod__bar {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 4px;
    border-bottom: 1px solid #aca899;
    button.active {
      font-weight: bold;
    }
    > button:not([class]),
    > button.active {
      border: 1px solid transparent;
      background: transparent;
      font-family: inherit;
      font-size: 11px;
      padding: 3px 7px;
      cursor: default;
      &:hover {
        border: 1px solid #b6bdd2;
        background: #eef2fb;
      }
    }
  }
  .mod__spacer {
    flex: 1;
  }

  .mod__error {
    color: #a00;
    &.bar {
      flex-shrink: 0;
      padding: 4px 8px;
      background: #fff4f4;
      border-bottom: 1px solid #e0b4b4;
    }
  }

  .mod__list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    background: #fff;
    margin: 3px;
    border: 1px solid #7f9db9;
    padding: 4px 8px;
  }

  .mod__note {
    color: #666;
    font-style: italic;
    padding: 10px 2px;
  }

  .mod__entry {
    padding: 8px 0;
    border-bottom: 1px solid #e6e6e6;
    &:last-child {
      border-bottom: none;
    }
    header {
      display: flex;
      align-items: baseline;
      gap: 5px;
      flex-wrap: wrap;
      margin-bottom: 4px;
    }
  }

  .mod__status {
    text-transform: uppercase;
    font-size: 9px;
    letter-spacing: 0.4px;
    padding: 1px 5px;
    border-radius: 2px;
    color: #fff;
    background: #888;
    &.published {
      background: #4f9e4f;
    }
    &.pending {
      background: #d9a441;
    }
    &.blocked {
      background: #b14141;
    }
    &.rejected {
      background: #888;
    }
  }

  .mod__meta {
    margin-left: auto;
    color: #888;
  }

  .mod__message {
    margin: 0 0 5px;
    line-height: 1.5;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    &.withheld {
      color: #a00;
      font-style: italic;
    }
  }

  /* Metadata grid: label column, value column. */
  .mod__facts {
    display: grid;
    grid-template-columns: 54px 1fr;
    gap: 2px 8px;
    margin: 0 0 6px;
    dt {
      color: #888;
    }
    dd {
      margin: 0;
      min-width: 0;
      overflow-wrap: anywhere;
      display: flex;
      align-items: baseline;
      gap: 6px;
      flex-wrap: wrap;
    }
  }

  .mod__hash,
  .mod__ip {
    font-family: 'Lucida Console', monospace;
    font-size: 10px;
    background: #f2f2f2;
    border: 1px solid #e0e0e0;
    padding: 0 3px;
  }
  .mod__ip {
    background: #fdf6e3;
    border-color: #e8dcb8;
  }
  .mod__ua {
    color: #666;
    font-size: 10px;
  }

  .mod__linkBtn {
    border: none;
    background: none;
    padding: 0;
    font-family: inherit;
    font-size: 10px;
    color: #0a46a0;
    text-decoration: underline;
    cursor: pointer;
  }

  .mod__signals {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 5px;
  }
  .mod__chip {
    background: #f0f0e8;
    border: 1px solid #d8d4c4;
    padding: 1px 5px;
    color: #555;
    font-size: 10px;
    &.claude {
      background: #eef2fb;
      border-color: #b6bdd2;
      color: #23417a;
    }
  }

  .mod__reply {
    margin: 0 0 5px 12px;
    padding: 4px 7px;
    background: #f4f6fb;
    border-left: 3px solid #7f9db9;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }

  .mod__replyBox textarea {
    width: 100%;
    height: 48px;
    resize: none;
    border: 1px solid #7f9db9;
    font-family: Tahoma, 'Noto Sans', sans-serif;
    font-size: 11px;
    padding: 3px;
  }

  .mod__actions {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
    margin-top: 5px;
  }

  .mod__status-bar {
    flex-shrink: 0;
    height: 20px;
    display: flex;
    align-items: stretch;
    border-top: 1px solid #fff;
  }
  .mod__cell {
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

export default Moderation;
