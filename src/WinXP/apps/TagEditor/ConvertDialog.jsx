/*
 * The preview dialog behind every bulk operation.
 *
 * Nothing here changes a file until OK is pressed, and the table above the
 * buttons shows exactly what each one will become — which is the whole reason
 * to trust a tool like this with a folder of music.
 */
import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

import XPDialogFrame from '../../../components/XPDialogFrame';
import XPButton from '../../../components/XPButton';

const Body = styled.div`
  width: 460px;
  padding: 10px 12px 12px;
  font-size: 11px;
  color: #000;

  .cv__lead {
    margin: 0 0 10px;
  }
  .cv__row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
  }
  .cv__row label {
    flex: none;
  }
  .cv__row input {
    flex: 1;
    min-width: 0;
    height: 19px;
    padding: 0 3px;
    border: 1px solid #7f9db9;
    font-family: inherit;
    font-size: 11px;
  }
  fieldset {
    margin: 0 0 10px;
    padding: 6px 8px 8px;
    border: 1px solid #d5d2ca;
  }
  legend {
    padding: 0 3px;
    color: #0046d5;
  }
  .cv__list {
    height: 150px;
    overflow: auto;
    border: 1px solid #7f9db9;
    background: #fff;
  }
  .cv__item {
    display: flex;
    padding: 1px 4px;
    white-space: nowrap;
  }
  .cv__item span {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cv__from {
    width: 46%;
    color: #555;
  }
  .cv__arrow {
    width: 16px;
    flex: none;
    text-align: center;
    color: #888;
  }
  .cv__to {
    flex: 1;
  }
  .cv__to--none {
    color: #a00;
  }
  .cv__fields {
    color: #444;
    margin: 0 0 10px;
  }
  .cv__option {
    display: flex;
    align-items: center;
    gap: 5px;
    margin: 0 0 10px;
  }
  .cv__option input {
    margin: 0;
  }
  .cv__buttons {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  }
`;

/**
 * `rows` is [{ from, to, ok }] — `to` is what the operation would produce and
 * `ok` false marks one it cannot do, which is shown but never applied.
 */
export default function ConvertDialog({
  title,
  lead,
  label = 'Format string:',
  format,
  onFormatChange,
  hint,
  option,
  rows,
  applyLabel = 'OK',
  onApply,
  onClose,
}) {
  const inputRef = useRef(null);
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);
  const doable = rows.filter(r => r.ok).length;

  return (
    <XPDialogFrame title={title} onClose={onClose} width={484}>
      <Body>
        <p className="cv__lead">{lead}</p>
        {onFormatChange && (
          <div className="cv__row">
            <label htmlFor="cv-format">{label}</label>
            <input
              id="cv-format"
              ref={inputRef}
              value={format}
              spellCheck={false}
              onChange={e => onFormatChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && doable) onApply();
              }}
            />
          </div>
        )}
        {hint && <div className="cv__fields">{hint}</div>}
        {option && (
          <label className="cv__option">
            <input
              type="checkbox"
              checked={option.checked}
              onChange={e => option.onChange(e.target.checked)}
            />
            <span>{option.label}</span>
          </label>
        )}
        <fieldset>
          <legend>Preview</legend>
          <div className="cv__list">
            {rows.map(row => (
              <div className="cv__item" key={row.from}>
                <span className="cv__from">{row.from}</span>
                <span className="cv__arrow">&rarr;</span>
                <span className={`cv__to${row.ok ? '' : ' cv__to--none'}`}>
                  {row.ok ? row.to : row.why || 'no change'}
                </span>
              </div>
            ))}
          </div>
        </fieldset>
        <div className="cv__buttons">
          <XPButton disabled={!doable} onClick={onApply}>
            {applyLabel}
          </XPButton>
          <XPButton onClick={onClose}>Cancel</XPButton>
        </div>
      </Body>
    </XPDialogFrame>
  );
}
