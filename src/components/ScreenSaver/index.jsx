import React, {
  useEffect,
  useRef,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';

import { createSaver, SAVERS } from './savers';
import { VFSContext } from '../../context/VFSContext';
import { portalRoot } from '../../WinXP/screen';

export { SAVERS, SAVER_NAMES, hasSettings, createSaver } from './savers';

export const SCREENSAVER_DEFAULTS = {
  name: '(None)',
  waitMinutes: 10,
  onResumeLogon: false,
  settings: {},
};

/** This user's screen saver configuration, with XP's defaults filled in. */
export function readScreenSaverConfig(vfs) {
  try {
    return {
      ...SCREENSAVER_DEFAULTS,
      ...(vfs.getUserConfig('screenSaver', null) || {}),
    };
  } catch {
    return { ...SCREENSAVER_DEFAULTS };
  }
}

/**
 * Runs a saver into a canvas sized to its box. Used both by the Screen Saver
 * tab's monitor preview and by the full-screen host, so the preview is the
 * real thing rather than a mock-up.
 */
export function SaverCanvas({
  name,
  settings,
  className,
  style,
  running,
  pictures,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || running === false) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const sizeToBox = () => {
      const rect = canvas.getBoundingClientRect();
      // The originals drew one pixel per screen pixel. Following that here
      // is both more faithful and much cheaper on a scaled display, where
      // honouring devicePixelRatio would more than double the fill cost of
      // a full-screen canvas every frame.
      const dpr = 1;
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w, h };
    };

    const { w, h } = sizeToBox();
    const saver = createSaver(name, w, h, settings, pictures);
    if (!saver) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      return undefined;
    }

    let raf = 0;
    let last = 0;
    const loop = now => {
      // Seconds since the last frame, clamped so a backgrounded tab doesn't
      // teleport everything on return
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;
      saver.frame(ctx, dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onResize = () => {
      const next = sizeToBox();
      saver.resize(next.w, next.h);
    };
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(onResize);
      ro.observe(canvas);
    }
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      if (ro) ro.disconnect();
      if (typeof saver.destroy === 'function') saver.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, JSON.stringify(settings || {}), running, pictures]);

  return <canvas ref={canvasRef} className={className} style={style} />;
}

/**
 * Savers that are vendored web apps rather than canvas renderers run in a
 * frame. Settings are pushed in through the hook the mirrored page exposes.
 */
function SaverFrame({ entry, settings, className, style }) {
  const ref = useRef(null);
  // Optional: the Screen Saver tab and the full-screen host both sit under
  // the VFS provider, but a frame can also be shown without one.
  const vfs = useContext(VFSContext);

  // Merge the registry defaults in: a saver the user has never configured
  // still has to obey what the Settings dialog says it is set to, rather
  // than whatever the vendored page happens to default to.
  const merged = useMemo(
    () => ({ ...(entry.defaults || {}), ...(settings || {}) }),
    [entry, settings],
  );

  // Settings that name a file in the VFS (a custom texture, say) reach the
  // frame as URLs the page can load: `fooPath` -> `fooUrl`.
  const fileKeys = entry.files || [];
  const filePaths = fileKeys.map(k => merged[k] || '').join('|');
  const [fileUrls, setFileUrls] = useState({});
  useEffect(() => {
    let live = true;
    if (!fileKeys.length) return undefined;
    (async () => {
      const out = {};
      for (const k of fileKeys) {
        const path = merged[k];
        const urlKey = k.replace(/Path$/, '') + 'Url';
        out[urlKey] = '';
        if (path && vfs && vfs.readFileUrl) {
          try {
            // eslint-disable-next-line no-await-in-loop
            out[urlKey] = (await vfs.readFileUrl(path)) || '';
          } catch {
            out[urlKey] = '';
          }
        }
      }
      if (live) setFileUrls(out);
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePaths, vfs && vfs.version]);

  const effective = useMemo(() => ({ ...merged, ...fileUrls }), [
    merged,
    fileUrls,
  ]);

  const push = useCallback(() => {
    try {
      const win = ref.current && ref.current.contentWindow;
      if (win && entry.apply) entry.apply(win, effective);
    } catch {
      // same-origin hiccup; the frame keeps its own defaults
    }
  }, [entry, effective]);

  useEffect(() => {
    push();
    // The page finishes booting after load, so keep nudging briefly
    const t = setInterval(push, 400);
    const stop = setTimeout(() => clearInterval(t), 4000);
    return () => {
      clearInterval(t);
      clearTimeout(stop);
    };
  }, [push]);

  return (
    <span className="ss-framewrap" style={{ display: 'contents' }}>
      <iframe
        ref={ref}
        title="Screen saver"
        src={entry.url}
        className={className}
        style={{ border: 'none', ...style }}
        scrolling="no"
        onLoad={push}
      />
    </span>
  );
}

/** Picks the canvas or frame implementation for a saver. */
export function SaverSurface({ name, settings, className, style, pictures }) {
  const entry = SAVERS[name];
  if (entry && entry.kind === 'iframe') {
    return (
      <SaverFrame
        entry={entry}
        settings={settings}
        className={className}
        style={style}
      />
    );
  }
  return (
    <SaverCanvas
      name={name}
      settings={settings}
      pictures={pictures}
      className={className}
      style={style}
    />
  );
}

/**
 * The saver running over everything. Any input dismisses it, exactly like the
 * real thing — including the first mouse move, which is why we ignore motion
 * for a beat after it starts.
 */
export function ScreenSaverOverlay({ name, settings, onDismiss, pictures }) {
  // Mystify with "Clear Screen" off draws over whatever was on the screen,
  // as ssmyst.scr does, so the desktop has to stay visible behind it.
  const seeThrough =
    name === 'Mystify' && !!settings && settings.clearScreen === false;
  const armedAt = useRef(Date.now());
  const catcherRef = useRef(null);
  // Callers pass an inline arrow, so its identity changes every render. Hold
  // it in a ref: otherwise the listener effect tears down and re-arms
  // constantly, and the saver can never be dismissed.
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  // Keep keyboard focus in the parent document so Escape and friends reach
  // the dismiss handler rather than a saver's frame.
  useEffect(() => {
    if (catcherRef.current) catcherRef.current.focus();
  }, []);

  useEffect(() => {
    armedAt.current = Date.now();
    // Where the pointer sat when the saver came up. Real screen savers
    // ignore jitter and only quit once the pointer genuinely moves, so we
    // measure displacement from here rather than trusting movementX/Y,
    // which some input paths never populate.
    let origin = null;
    const settled = () => Date.now() - armedAt.current > 400;
    const onMove = e => {
      if (!settled()) return;
      if (!origin) {
        origin = { x: e.clientX, y: e.clientY };
        return;
      }
      if (
        Math.abs(e.clientX - origin.x) + Math.abs(e.clientY - origin.y) >=
        4
      ) {
        dismissRef.current();
      }
    };
    const onAny = () => {
      if (settled()) dismissRef.current();
    };
    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('mousedown', onAny, true);
    window.addEventListener('wheel', onAny, true);
    window.addEventListener('keydown', onAny, true);
    window.addEventListener('touchstart', onAny, true);
    return () => {
      window.removeEventListener('mousemove', onMove, true);
      window.removeEventListener('mousedown', onAny, true);
      window.removeEventListener('wheel', onAny, true);
      window.removeEventListener('keydown', onAny, true);
      window.removeEventListener('touchstart', onAny, true);
    };
    // Arm exactly once — see dismissRef above
  }, []);

  return createPortal(
    <Overlay $seeThrough={seeThrough}>
      <SaverSurface
        name={name}
        settings={settings}
        pictures={pictures}
        className="ss-canvas"
      />
      {/* Frame-based savers would otherwise swallow the input that is
          meant to dismiss the saver; this catches it in the parent. */}
      <div className="ss-catcher" ref={catcherRef} tabIndex={-1} />
    </Overlay>,
    portalRoot(),
  );
}

/**
 * Watches for idleness and puts the saver up. Mounted once per live desktop
 * session; a session that isn't the active one never arms.
 */
export default function ScreenSaverHost({ config, active = true, pictures }) {
  const [showing, setShowing] = useState(false);
  const showingRef = useRef(showing);
  showingRef.current = showing;

  const name = (config && config.name) || '(None)';
  const waitMs = Math.max(1, (config && config.waitMinutes) || 10) * 60 * 1000;
  const armed = active && name !== '(None)';

  const dismiss = useCallback(() => setShowing(false), []);

  useEffect(() => {
    if (!armed) {
      setShowing(false);
      return undefined;
    }
    let last = Date.now();
    const bump = () => {
      last = Date.now();
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart'];
    events.forEach(e => window.addEventListener(e, bump, true));
    const timer = setInterval(() => {
      if (showingRef.current) return;
      if (Date.now() - last >= waitMs) setShowing(true);
    }, 1000);
    return () => {
      events.forEach(e => window.removeEventListener(e, bump, true));
      clearInterval(timer);
    };
  }, [armed, waitMs]);

  if (!showing || !armed) return null;
  return (
    <ScreenSaverOverlay
      name={name}
      settings={config && config.settings}
      pictures={pictures}
      onDismiss={dismiss}
    />
  );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: ${p => (p.$seeThrough ? 'transparent' : '#000')};
  cursor: none;
  overflow: hidden;

  .ss-canvas {
    display: block;
    width: 100%;
    height: 100%;
    border: none;
  }
  .ss-catcher {
    position: absolute;
    inset: 0;
    background: transparent;
    cursor: none;
    outline: none;
  }
`;
