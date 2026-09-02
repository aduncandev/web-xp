import React from 'react';
import styled from 'styled-components';

/**
 * Catches a program that throws while rendering. Without this the error
 * reaches the shell's crash handler and the whole desktop blue-screens; XP
 * closed the one program instead, with the apology below.
 */
export default class ProgramErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error(`${this.props.title || 'A program'} crashed:`, error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const { title, onClose } = this.props;
    return (
      <Panel>
        <div className="crash__title">
          {title || 'This program'} has encountered a problem and needs to
          close. We are sorry for the inconvenience.
        </div>
        <div className="crash__body">
          If you were in the middle of something, the information you were
          working on might be lost.
        </div>
        <div className="crash__detail">{String(this.state.error)}</div>
        <div className="crash__buttons">
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </Panel>
    );
  }
}

const Panel = styled.div`
  height: 100%;
  box-sizing: border-box;
  padding: 14px 16px;
  background: var(--xp-face, #ece9d8);
  color: #000;
  font-family: Tahoma, sans-serif;
  font-size: 11px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: auto;
  .crash__title {
    font-weight: bold;
  }
  .crash__detail {
    font-family: 'Lucida Console', monospace;
    font-size: 10px;
    color: #444;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .crash__buttons {
    margin-top: auto;
    display: flex;
    justify-content: flex-end;
  }
  button {
    min-width: 75px;
    height: 23px;
    font-family: Tahoma, sans-serif;
    font-size: 11px;
    background: var(--xp-face, #ece9d8);
    border: 1px solid #003c74;
    border-radius: 3px;
    box-shadow: inset -1px -1px #a8a89c, inset 1px 1px #fff;
    cursor: pointer;
  }
`;
