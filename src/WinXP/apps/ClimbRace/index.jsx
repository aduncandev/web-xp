import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

import { useVolume } from '../../../context/VolumeContext';
import { useVFS } from '../../../context/VFSContext';
import { getCurrentUserName } from '../../../context/users';
import { createGame } from './engine';

export default function ClimbRace({ onFocus, isFocus }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const { effectiveVolume } = useVolume();
  const volRef = useRef(effectiveVolume);
  volRef.current = effectiveVolume;
  const vfs = useVFS();
  const vfsRef = useRef(vfs);
  vfsRef.current = vfs;
  const userRef = useRef(getCurrentUserName());

  useEffect(() => {
    const wrap = wrapRef.current;
    const loadSave = () => {
      const cur = vfsRef.current.getUserConfigFor(
        userRef.current,
        'deltascend',
        null,
      );
      const data = cur && typeof cur === 'object' ? { ...cur } : {};
      if (!data.best || typeof data.best !== 'object') data.best = {};
      if (!data.paid || typeof data.paid !== 'object') data.paid = {};
      return data;
    };
    const game = createGame(canvasRef.current, {
      getVolume: () => volRef.current * 0.8,
      keyTarget: wrap,
      store: {
        load: loadSave,
        save: data =>
          vfsRef.current.setUserConfigFor(userRef.current, 'deltascend', data),
      },
      awardPoints: n => {
        try {
          const user = userRef.current;
          const cur = vfsRef.current.getUserConfigFor(user, 'xpPoints', 0);
          const points = Number.isFinite(cur) && cur > 0 ? cur : 0;
          vfsRef.current.setUserConfigFor(user, 'xpPoints', points + n);
        } catch (e) {
        }
      },
    });
    gameRef.current = game;
    wrap.focus();
    return () => game.destroy();
  }, []);

  useEffect(() => {
    if (gameRef.current) gameRef.current.refreshVolume();
  }, [effectiveVolume]);

  useEffect(() => {
    if (isFocus && wrapRef.current) wrapRef.current.focus();
  }, [isFocus]);

  return (
    <Body
      ref={wrapRef}
      tabIndex={0}
      onMouseDown={() => wrapRef.current && wrapRef.current.focus()}
    >
      <canvas ref={canvasRef} width={640} height={480} />
    </Body>
  );
}

const Body = styled.div`
  position: absolute;
  inset: 0;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  overflow: hidden;

  canvas {
    width: 100%;
    height: 100%;
    max-width: calc(100vh * 4 / 3);
    object-fit: contain;
    image-rendering: pixelated;
  }
`;
