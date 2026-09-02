/*
 * The two password dialogs Compressed Folders had, control for control:
 * ZIPFLDR dialog 154 "Password needed" and dialog 153 "Add Password".
 */
import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

import XPDialogFrame from '../XPDialogFrame';
import XPButton from '../XPButton';
import keyIcon from 'assets/windowsIcons/zipfldr-key(32x32).png';

const Body = styled.div`
  padding: 10px 12px 12px;
  font-size: 11px;
  color: #000;

  .zp__top {
    display: flex;
    gap: 10px;
  }
  .zp__icon {
    flex: none;
    width: 32px;
    height: 32px;
    image-rendering: pixelated;
  }
  .zp__msg {
    flex: 1;
    min-width: 0;
    line-height: 15px;
  }
  .zp__fields {
    margin: 14px 0 0 42px;
  }
  .zp__row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .zp__row label {
    flex: none;
    width: 96px;
    text-align: right;
  }
  .zp__row input {
    flex: 1;
    min-width: 0;
    height: 19px;
    padding: 0 3px;
    border: 1px solid var(--xp-select-border, #7f9db9);
    font-family: inherit;
    font-size: 11px;
  }
  .zp__buttons {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: none;
    width: 76px;
  }
  .zp__buttons button {
    min-width: 0;
    width: 100%;
  }
  .zp__ok {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 14px;
  }
  .zp__error {
    margin: 8px 0 0 42px;
    color: #a00;
  }
`;

/**
 * "File '%s' is password protected. Please enter the password in the box
 * below." — with the archive's own three buttons down the right.
 */
export function PasswordNeeded({
  fileName,
  retry,
  onSubmit,
  onSkip,
  onCancel,
}) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  return (
    <XPDialogFrame title="Password needed" onClose={onCancel} width={360}>
      <Body>
        <div className="zp__top">
          <img className="zp__icon" src={keyIcon} alt="" />
          <div className="zp__msg">
            File &apos;{fileName}&apos; is password protected. Please enter the
            password in the box below.
          </div>
          <div className="zp__buttons">
            <XPButton onClick={() => onSubmit(value)}>OK</XPButton>
            <XPButton onClick={onSkip}>Skip File</XPButton>
            <XPButton onClick={onCancel}>Cancel</XPButton>
          </div>
        </div>
        <div className="zp__fields">
          <div className="zp__row">
            <label htmlFor="zp-pw">Password:</label>
            <input
              id="zp-pw"
              ref={inputRef}
              type="password"
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') onSubmit(value);
              }}
            />
          </div>
        </div>
        {retry && (
          <div className="zp__error">
            The password you have entered is invalid.
          </div>
        )}
      </Body>
    </XPDialogFrame>
  );
}

/** "Enter a password to protect the Compressed (zipped) Folder." */
export function AddPassword({ onSubmit, onCancel }) {
  const [value, setValue] = useState('');
  const [confirm, setConfirm] = useState('');
  const [problem, setProblem] = useState('');
  const inputRef = useRef(null);
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const submit = () => {
    if (value !== confirm) {
      // ZIPFLDR #10131
      setProblem(
        'The New and Confirm passwords do not match. Please enter them again.',
      );
      setConfirm('');
      return;
    }
    onSubmit(value);
  };

  return (
    <XPDialogFrame title="Add Password" onClose={onCancel} width={400}>
      <Body>
        <div className="zp__top">
          <img className="zp__icon" src={keyIcon} alt="" />
          <div className="zp__msg">
            Enter a password to protect the Compressed (zipped) Folder.
          </div>
          <div className="zp__buttons">
            <XPButton onClick={submit}>OK</XPButton>
            <XPButton onClick={onCancel}>Cancel</XPButton>
          </div>
        </div>
        <div className="zp__fields">
          <div className="zp__row">
            <label htmlFor="zp-new">Password:</label>
            <input
              id="zp-new"
              ref={inputRef}
              type="password"
              value={value}
              onChange={e => setValue(e.target.value)}
            />
          </div>
          <div className="zp__row">
            <label htmlFor="zp-confirm">Confirm Password:</label>
            <input
              id="zp-confirm"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') submit();
              }}
            />
          </div>
        </div>
        {problem && <div className="zp__error">{problem}</div>}
      </Body>
    </XPDialogFrame>
  );
}
