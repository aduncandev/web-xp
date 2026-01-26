import React, { useEffect, useRef } from 'react';
import Webamp from 'webamp';
import { initialTracks } from './config';

function Winamp({ onClose, onMinimize }) {
  const ref = useRef(null);
  const webamp = useRef(null);
  useEffect(() => {
    const target = ref.current;
    if (!target) {
      return;
    }
    webamp.current = new Webamp({
      initialTracks,
    });

    // Render Webamp directly into the target container
    webamp.current.renderWhenReady(target);

    // Cleanup function remains the same
    return () => {
      // Ensure webamp.current exists before disposing, just in case.
      if (webamp.current) {
        webamp.current.dispose();
        webamp.current = null;
      }
    };
  }, []); // Empty dependency array means this runs only once on mount
  useEffect(() => {
    if (webamp.current) {
      webamp.current.onClose(onClose);
      webamp.current.onMinimize(onMinimize);
    }
  });
  return (
    <div
      style={{ width: '100%', height: '100%' }}
      ref={ref}
    />
  );
}

export default Winamp;
