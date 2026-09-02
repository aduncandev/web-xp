import { useRef, useState } from 'react';

// Where a drag may start a band: the empty parts of the file area, not an item
const BAND_ORIGINS = [
  'com__content__right',
  'com__content__right__card',
  'com__content__right__card__content',
  'com__content__empty',
  'com__view',
  'com__table',
];

/**
 * Luna rubber-band selection over the file list. `areaRef` is the scrolling
 * file area and every item carries data-path. The band is kept in area
 * coordinates: the window's CSS transform makes position:fixed resolve
 * against the window, so it is drawn absolutely inside the area instead.
 */
export function useRubberBand({
  areaRef,
  selectedPaths,
  setSelectedPaths,
  disabled,
}) {
  const [rubber, setRubber] = useState(null);
  const drag = useRef(null);
  // A drag that drew a band ends in a click on the area, which would clear
  // the selection it just made
  const suppressClick = useRef(false);

  const startRubberBand = e => {
    if (e.button !== 0 || disabled) return;
    const t = e.target;
    const ok =
      BAND_ORIGINS.some(c => t.classList.contains(c)) || t.tagName === 'TBODY';
    if (!ok) return;
    const base = e.ctrlKey ? [...selectedPaths] : [];
    drag.current = { x0: e.clientX, y0: e.clientY, base, active: false };
    const onMove = ev => {
      const s = drag.current;
      if (!s) return;
      if (
        !s.active &&
        Math.abs(ev.clientX - s.x0) < 4 &&
        Math.abs(ev.clientY - s.y0) < 4
      )
        return;
      s.active = true;
      ev.preventDefault();
      const area = areaRef.current;
      if (!area) return;
      const ar = area.getBoundingClientRect();
      const rect = {
        left: Math.max(Math.min(s.x0, ev.clientX), ar.left),
        top: Math.max(Math.min(s.y0, ev.clientY), ar.top),
        right: Math.min(Math.max(s.x0, ev.clientX), ar.right),
        bottom: Math.min(Math.max(s.y0, ev.clientY), ar.bottom),
      };
      setRubber({
        left: rect.left - ar.left + area.scrollLeft,
        top: rect.top - ar.top + area.scrollTop,
        right: rect.right - ar.left + area.scrollLeft,
        bottom: rect.bottom - ar.top + area.scrollTop,
      });
      const hit = [];
      area.querySelectorAll('[data-path]').forEach(el => {
        const r = el.getBoundingClientRect();
        if (
          r.left < rect.right &&
          r.right > rect.left &&
          r.top < rect.bottom &&
          r.bottom > rect.top
        )
          hit.push(el.getAttribute('data-path'));
      });
      setSelectedPaths([...new Set([...s.base, ...hit])]);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      if (drag.current && drag.current.active) suppressClick.current = true;
      drag.current = null;
      setRubber(null);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp, { once: true });
  };

  /** True once, for the click that ends a band drag. */
  const consumeSuppressedClick = () => {
    if (!suppressClick.current) return false;
    suppressClick.current = false;
    return true;
  };

  return { rubber, startRubberBand, consumeSuppressedClick };
}
