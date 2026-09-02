// The channel's 608x456 page scaled to whatever the window gives it.
import { useEffect, useRef, useState } from 'react';

import { CANVAS_H, CANVAS_W } from './styles';

export function useScaledStage() {
  const shellRef = useRef(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = shellRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width && r.height)
        setScale(Math.min(r.width / CANVAS_W, r.height / CANVAS_H));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { shellRef, scale };
}
