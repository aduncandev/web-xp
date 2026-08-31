/*
 * Windows Error Recovery — the black pre-boot screen XP showed after a bad
 * shutdown, repurposed for the one genuinely destructive moment this site
 * has: a filesystem schema bump that must erase the stored tree. Boot holds
 * here until the user picks a way forward:
 *
 *   Back Up My Files       download everything they made as a .zip
 *   Start Windows Normally reinstall (erase and reseed), then boot
 *   Shut Down              leave the store untouched; "safe to close" screen
 *
 * Keyboard-first like the real one (arrows + Enter, countdown to the
 * default choice, any interaction stops the clock), but options also take a
 * click. The countdown's default is the backup — the only auto-selectable
 * action that destroys nothing.
 */
import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

const COUNTDOWN_S = 30;

const OPTIONS = [
  {
    label: 'Back Up My Files',
    description:
      'Download a .zip archive of the files and settings stored on this computer.',
  },
  {
    label: 'Start Windows Normally',
    description:
      'Reinstall Windows with its regular settings. The files on this computer will be erased.',
  },
  {
    label: 'Shut Down',
    description: 'Leave this computer untouched and decide on your next visit.',
  },
];

export default function RecoveryScreen({ recovery }) {
  const [highlighted, setHighlighted] = useState(0);
  const [countdown, setCountdown] = useState(COUNTDOWN_S);
  const [phase, setPhase] = useState('menu'); // menu | starting | closed
  const [status, setStatus] = useState(null);
  const busyRef = useRef(false);

  const stopCountdown = () => setCountdown(null);

  const select = async index => {
    if (busyRef.current || phase !== 'menu') return;
    stopCountdown();
    setHighlighted(index);
    if (index === 0) {
      busyRef.current = true;
      setStatus('Preparing the backup...');
      try {
        const { blob, count } = await recovery.buildBackup();
        const stamp = new Date().toISOString().slice(0, 10);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `windows-backup-${stamp}.zip`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 60000);
        setStatus(
          `Backup of ${count} file${count === 1 ? '' : 's'} saved to your ` +
            'downloads. Choose Start Windows Normally when you are ready.',
        );
        setHighlighted(1);
      } catch (err) {
        setStatus('The backup could not be created. You can try again.');
      }
      busyRef.current = false;
    } else if (index === 1) {
      busyRef.current = true;
      setPhase('starting');
      await recovery.proceed();
      // The provider clears `recovery` once the reseed lands; nothing to do.
    } else {
      setPhase('closed');
    }
  };

  const highlightedRef = useRef(highlighted);
  highlightedRef.current = highlighted;
  const selectRef = useRef(select);
  selectRef.current = select;

  // The clock: ticks toward auto-selecting the highlighted (default)
  // choice, exactly like the real screen. It never survives first contact.
  useEffect(() => {
    if (countdown == null || phase !== 'menu') return undefined;
    if (countdown <= 0) {
      selectRef.current(highlightedRef.current);
      return undefined;
    }
    const t = setTimeout(
      () => setCountdown(c => (c == null ? c : c - 1)),
      1000,
    );
    return () => clearTimeout(t);
  }, [countdown, phase]);

  useEffect(() => {
    const onKey = e => {
      if (phase !== 'menu') return;
      stopCountdown();
      // Legacy names ('Up'/'Down'/'Return') come from old engines and some
      // synthetic-event tooling; the screen answers to both.
      if (e.key === 'ArrowUp' || e.key === 'Up')
        setHighlighted(h => (h + OPTIONS.length - 1) % OPTIONS.length);
      else if (e.key === 'ArrowDown' || e.key === 'Down')
        setHighlighted(h => (h + 1) % OPTIONS.length);
      else if (e.key === 'Enter' || e.key === 'Return')
        selectRef.current(highlightedRef.current);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);

  if (phase === 'closed') {
    return (
      <Screen onMouseDown={stopCountdown}>
        <div className="wer__safe">
          It is now safe to close this page.
          <span className="wer__safe-sub">
            Your files were left untouched and will be here on your next visit.
          </span>
        </div>
      </Screen>
    );
  }

  if (phase === 'starting') {
    return <Screen />;
  }

  return (
    <Screen onMouseDown={stopCountdown}>
      <div className="wer__titlebar">Windows Error Recovery</div>
      <div className="wer__body">
        <p>
          Windows did not start successfully. A recent update changed how this
          computer stores its files, and Windows must be reinstalled. The files
          and settings on this computer will be erased.
        </p>
        <p>
          Your work can be saved first: choose Back Up My Files to download a
          copy, and restore it later from Start &gt; All Programs &gt;
          Accessories &gt; System Tools &gt; Backup.
          <br />
          (Use the arrow keys to highlight your choice.)
        </p>
        <div className="wer__menu">
          {OPTIONS.map((opt, i) => (
            <div
              key={opt.label}
              className={`wer__option${
                highlighted === i ? ' wer__option--hot' : ''
              }`}
              onClick={() => select(i)}
            >
              {opt.label}
            </div>
          ))}
        </div>
        {countdown != null && (
          <p className="wer__countdown">
            Seconds until the highlighted choice will be selected automatically:{' '}
            {countdown}
          </p>
        )}
        <p>Description: {OPTIONS[highlighted].description}</p>
        {status && <p className="wer__status">{status}</p>}
      </div>
      <div className="wer__footer">ENTER=Choose</div>
    </Screen>
  );
}

const Screen = styled.div`
  position: fixed;
  inset: 0;
  z-index: 999999;
  background: #000;
  color: #d4d4d4;
  font-family: 'Lucida Console', 'Consolas', 'Courier New', monospace;
  font-size: 15px;
  line-height: 1.6;
  display: flex;
  flex-direction: column;
  cursor: default;
  user-select: none;

  .wer__titlebar {
    margin: 14px 8px 0;
    background: #a9a9a9;
    color: #000;
    text-align: center;
    padding: 2px 0;
  }

  .wer__body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 24px 30px 0;
    max-width: 900px;
    p {
      margin: 0 0 22px;
    }
  }

  .wer__menu {
    margin: 0 0 26px;
  }

  .wer__option {
    padding: 2px 10px;
    margin-left: 38px;
    width: 340px;
    max-width: calc(100% - 38px);
    color: #d4d4d4;
  }
  .wer__option--hot {
    background: #a9a9a9;
    color: #000;
  }
  /* Real screens had no pointer, but people will click anyway. */
  .wer__option:hover {
    text-decoration: underline;
  }

  .wer__countdown,
  .wer__status {
    margin-bottom: 8px !important;
  }
  .wer__status {
    color: #fff;
  }

  .wer__footer {
    margin: 0 8px 10px;
    background: #a9a9a9;
    color: #000;
    padding: 2px 10px;
  }

  .wer__safe {
    margin: auto;
    text-align: center;
    color: #ffb400;
    font-size: 26px;
    line-height: 1.5;
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 0 24px;
  }
  .wer__safe-sub {
    font-size: 14px;
    color: #d4d4d4;
  }
`;
