/*
 * The boot device menu, before anything else on a fresh machine.
 *
 * It exists for a mundane reason as much as an authentic one. Browsers refuse
 * to play audio until the page has had a genuine user gesture, so without
 * something to press first, the OOBE music that follows starts silent and
 * only fades in later on a stray click. This screen collects that gesture,
 * and it is the one screen with no way past it:
 *
 * - No timeout. A screen that continues on its own would let people through
 *   without the gesture, which is the one thing it is here for.
 * - No key handling of any kind. An earlier version bound Enter and guarded
 *   it behind a selection; a dispatched keydown got through anyway. The
 *   device is a real <button> and nothing else listens, so the only way on
 *   is a click — and a keyboard user activating that button still produces a
 *   real click event, which grants activation just the same.
 *
 * A boot menu rather than XP's partition screen because nothing is installed
 * here — Setup runs, but no files are copied to a disk, so offering to
 * "install to C:" would be describing something that never happens. Picking
 * a boot device is the true statement, and every motherboard's menu looks
 * a little different, so it owes no particular one an exact likeness.
 */
import React from 'react';
import styled from 'styled-components';

/*
 * The hard disk is empty, which is why Setup is about to run at all, and the
 * network card has nowhere to boot from. Only the disc can start anything —
 * so the one live row is also the only one that makes sense to click.
 */
const DEVICES = [
  { id: 'cd', label: 'ATAPI CD:', name: 'webXP Setup Disc', boots: true },
  { id: 'hdd', label: 'ATA HDD:', name: 'No operating system found' },
  { id: 'net', label: 'Network:', name: 'Realtek RTL8139 PXE' },
];

function SetupPrompt({ onContinue }) {
  return (
    <Screen>
      <div className="bm__frame">
        <div className="bm__title">Please select boot device:</div>

        <ul className="bm__list">
          {DEVICES.map(d =>
            d.boots ? (
              <li key={d.id}>
                <button type="button" className="bm__row" onClick={onContinue}>
                  <span className="bm__caret">&gt;</span>
                  <span className="bm__label">{d.label}</span>
                  <span>{d.name}</span>
                </button>
              </li>
            ) : (
              <li key={d.id} className="bm__row bm__row--dead">
                <span className="bm__caret" />
                <span className="bm__label">{d.label}</span>
                <span>{d.name}</span>
              </li>
            ),
          )}
        </ul>
      </div>

      <div className="bm__foot">Select a device to continue</div>
    </Screen>
  );
}

const Screen = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9998;
  background: #000000;
  color: #c8c8c8;
  font-family: 'Lucida Console', 'Consolas', 'Courier New', monospace;
  font-size: 15px;
  line-height: 1.5;
  user-select: none;
  overflow: hidden;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 26px;

  .bm__frame {
    border: 1px solid #c8c8c8;
    padding: 14px 0 12px;
    min-width: min(56ch, 92vw);
  }

  .bm__title {
    padding: 0 3ch 12px;
    color: #ffffff;
  }

  .bm__list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .bm__row {
    display: flex;
    align-items: baseline;
    gap: 1ch;
    width: 100%;
    padding: 1px 3ch;
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      /* Inverse video, the way a text-mode menu shows its selection. */
      background: #c8c8c8;
      color: #000000;
      outline: none;
    }
  }

  /* Nothing to boot from, so it reads as unavailable and does not respond. */
  .bm__row--dead {
    color: #6a6a6a;
    cursor: default;
  }

  .bm__caret {
    width: 1ch;
  }
  .bm__row:hover .bm__caret,
  .bm__row:focus-visible .bm__caret {
    color: inherit;
  }
  .bm__label {
    width: 10ch;
    flex: none;
  }

  .bm__foot {
    color: #8a8a8a;
  }

  @media (max-width: 640px) {
    font-size: 12px;
    gap: 18px;
    .bm__frame {
      min-width: 96vw;
    }
    .bm__row {
      padding-left: 1.5ch;
      padding-right: 1.5ch;
    }
    .bm__title {
      padding-left: 1.5ch;
    }
  }
`;

export default SetupPrompt;
