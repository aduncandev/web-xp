import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import styled from 'styled-components';

import { useVFS } from '../../../context/VFSContext';
import { useDialog } from '../../../context/DialogContext';
import { getParentPath, getExtension } from '../../../context/vfsUtils';
import { EXE_PATHS } from '../../../context/vfsConstants';
import { TOOL_BUTTONS, ToolIcon } from './toolbar';
import Slideshow from './Slideshow';
import FileDialog from '../../../components/FileDialog';

// "Copy To" writes the picture out again; XP offers the format list here
const COPY_FILTERS = [
  { label: 'JPEG', extensions: ['.jpg', '.jpeg'] },
  { label: 'Bitmap', extensions: ['.bmp'] },
  { label: 'PNG', extensions: ['.png'] },
  { label: 'GIF', extensions: ['.gif'] },
  { label: 'TIFF', extensions: ['.tif', '.tiff'] },
];

// Everything shimgvw.dll will render inline
const VIEWABLE = [
  '.bmp',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.tif',
  '.tiff',
  '.ico',
  '.webp',
  '.wmf',
  '.emf',
];

const ZOOM_STEPS = [
  0.05,
  0.1,
  0.15,
  0.25,
  0.33,
  0.5,
  0.66,
  0.75,
  1,
  1.5,
  2,
  3,
  4,
  6,
  8,
  12,
  16,
];

const isViewable = path => VIEWABLE.includes(getExtension(path).toLowerCase());

/**
 * Windows Picture and Fax Viewer (shimgvw.dll).
 *
 * Opens with one image and walks the rest of its folder with Previous/Next,
 * exactly like the real thing. Best Fit shrinks oversized pictures to the
 * window but never enlarges small ones; Actual Size pins 1:1. Rotation is
 * view-only unless the user saves, which is also how XP behaves until you
 * close the window.
 */
function PictureViewer({
  filePath,
  onClose,
  onShellOpen,
  onSetHeader,
  isFocus,
}) {
  const vfs = useVFS();
  const dlg = useDialog();

  const [current, setCurrent] = useState(filePath || null);
  const [url, setUrl] = useState(null);
  const [natural, setNatural] = useState(null); // { w, h }
  const [failed, setFailed] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [fitMode, setFitMode] = useState(true); // Best Fit is XP's default
  const [slideshow, setSlideshow] = useState(false);
  const [copyToOpen, setCopyToOpen] = useState(false);
  const stageRef = useRef(null);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });

  // Sibling images in the same folder, in shell order — the Previous/Next set
  const siblings = useMemo(() => {
    if (!current || !vfs.initialized) return [];
    const dir = getParentPath(current);
    if (!dir) return current ? [current] : [];
    return vfs
      .listDir(dir)
      .filter(n => n.type === 'file' && isViewable(n.path))
      .map(n => n.path)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, vfs.version, vfs.initialized]);

  const index = siblings.indexOf(current);
  const hasSiblings = siblings.length > 1;

  // Resolve the current file to something an <img> can show
  useEffect(() => {
    let live = true;
    if (!current || !vfs.initialized) return undefined;
    setFailed(false);
    setNatural(null);
    vfs
      .readFileUrl(current)
      .then(u => {
        if (!live) return;
        if (!u) {
          setFailed(true);
          setUrl(null);
          return;
        }
        setUrl(u);
      })
      .catch(() => {
        if (live) {
          setFailed(true);
          setUrl(null);
        }
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, vfs.initialized, vfs.version]);

  // "Sunset.jpg - Windows Picture and Fax Viewer", tracking Previous/Next
  useEffect(() => {
    if (!onSetHeader) return;
    const n = current ? vfs.getNode(current) : null;
    onSetHeader({
      title: n
        ? `${n.name} - Windows Picture and Fax Viewer`
        : 'Windows Picture and Fax Viewer',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, vfs.version]);

  // Track the viewport so Best Fit can do its arithmetic
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => {
      setStageSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setStageSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Best Fit: shrink to the window, never blow a small picture up
  const fitScale = useMemo(() => {
    if (!natural || !stageSize.w || !stageSize.h) return 1;
    const turned = rotation % 180 !== 0;
    const w = turned ? natural.h : natural.w;
    const h = turned ? natural.w : natural.h;
    if (!w || !h) return 1;
    return Math.min(1, (stageSize.w - 16) / w, (stageSize.h - 16) / h);
  }, [natural, stageSize, rotation]);

  const scale = fitMode ? fitScale : zoom;

  // Rotated pictures swap their bounding box, which is what the scroll area
  // has to be sized against.
  const display = useMemo(() => {
    if (!natural) return { w: 0, h: 0 };
    const turned = rotation % 180 !== 0;
    const w = (turned ? natural.h : natural.w) * scale;
    const h = (turned ? natural.w : natural.h) * scale;
    return { w: Math.round(w), h: Math.round(h) };
  }, [natural, rotation, scale]);

  const goTo = useCallback(
    delta => {
      if (siblings.length === 0) return;
      const at = siblings.indexOf(current);
      const next = (at + delta + siblings.length) % siblings.length;
      setCurrent(siblings[next]);
      setRotation(0);
      setFitMode(true);
      setZoom(1);
    },
    [siblings, current],
  );

  const stepZoom = useCallback(
    dir => {
      const from = fitMode ? fitScale : zoom;
      const steps = dir > 0 ? ZOOM_STEPS : [...ZOOM_STEPS].reverse();
      const next =
        steps.find(s => (dir > 0 ? s > from + 0.001 : s < from - 0.001)) ||
        from;
      setFitMode(false);
      setZoom(next);
    },
    [fitMode, fitScale, zoom],
  );

  // The wheel zooms, like the real viewer
  const onWheel = e => {
    if (!natural) return;
    e.preventDefault();
    stepZoom(e.deltaY < 0 ? 1 : -1);
  };

  // Drag anywhere on an over-sized picture to pan it
  const onStageMouseDown = e => {
    const el = stageRef.current;
    if (!el || e.button !== 0) return;
    if (el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight)
      return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const fromLeft = el.scrollLeft;
    const fromTop = el.scrollTop;
    const onMove = ev => {
      el.scrollLeft = fromLeft - (ev.clientX - startX);
      el.scrollTop = fromTop - (ev.clientY - startY);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const rotate = dir => setRotation(r => (r + dir * 90 + 360) % 360);

  // Copy To writes the picture's bytes to the chosen destination
  const copyTo = async destPath => {
    setCopyToOpen(false);
    try {
      const blob = await vfs.readBinaryFile(current);
      if (!blob) {
        dlg.alert(
          'The picture could not be read.',
          'Windows Picture and Fax Viewer',
          { icon: 'error' },
        );
        return;
      }
      if (!vfs.exists(destPath)) vfs.createFile(destPath, '');
      await vfs.writeBinaryFile(destPath, blob, blob.type);
    } catch {
      dlg.alert(
        'The picture could not be copied.',
        'Windows Picture and Fax Viewer',
        { icon: 'error' },
      );
    }
  };

  const deleteCurrent = async () => {
    const node = vfs.getNode(current);
    if (!node) return;
    const yes = await dlg.confirm(
      `Are you sure you want to send '${node.name}' to the Recycle Bin?`,
      'Confirm File Delete',
      { icon: 'none' },
    );
    if (!yes) return;
    const remaining = siblings.filter(p => p !== current);
    vfs.deleteNode(current);
    if (remaining.length === 0) {
      if (onClose) onClose();
      return;
    }
    setCurrent(remaining[Math.min(index, remaining.length - 1)]);
  };

  // XP's "Open for editing" hands the picture to Paint and closes the viewer
  const openForEditing = () => {
    if (onShellOpen)
      onShellOpen(EXE_PATHS.MSPAINT, { injectProps: { filePath: current } });
    if (onClose) onClose();
  };

  const actions = {
    prev: () => goTo(-1),
    next: () => goTo(1),
    fit: () => setFitMode(true),
    actual: () => {
      setFitMode(false);
      setZoom(1);
    },
    slideshow: () => setSlideshow(true),
    zoomIn: () => stepZoom(1),
    zoomOut: () => stepZoom(-1),
    rotateCw: () => rotate(1),
    rotateCcw: () => rotate(-1),
    delete: deleteCurrent,
    print: () => window.print(),
    copyTo: () => setCopyToOpen(true),
    edit: openForEditing,
    help: () =>
      dlg.alert(
        'Use the arrow keys to move between pictures, + and - to zoom, and Ctrl+K / Ctrl+L to rotate.',
        'Windows Picture and Fax Viewer',
      ),
  };

  const enabled = {
    prev: hasSiblings,
    next: hasSiblings,
    fit: !!natural,
    actual: !!natural,
    slideshow: !!natural,
    zoomIn: !!natural,
    zoomOut: !!natural,
    rotateCw: !!natural,
    rotateCcw: !!natural,
    delete: !!current,
    print: !!natural,
    copyTo: !!natural,
    edit: !!natural,
    help: true,
  };

  // Keyboard, matching the real viewer's accelerators
  useEffect(() => {
    if (!isFocus) return undefined;
    const onKey = e => {
      const key = e.key;
      if (key === 'Escape' && slideshow) {
        setSlideshow(false);
      } else if (key === 'ArrowRight' || key === 'PageDown') {
        goTo(1);
      } else if (key === 'ArrowLeft' || key === 'PageUp') {
        goTo(-1);
      } else if (key === '+' || key === '=') {
        stepZoom(1);
      } else if (key === '-') {
        stepZoom(-1);
      } else if (e.ctrlKey && key.toLowerCase() === 'k') {
        rotate(1);
      } else if (e.ctrlKey && key.toLowerCase() === 'l') {
        rotate(-1);
      } else {
        return;
      }
      e.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocus, slideshow, goTo]);

  const node = current ? vfs.getNode(current) : null;

  return (
    <Container>
      <Stage ref={stageRef} onWheel={onWheel} onMouseDown={onStageMouseDown}>
        {url && !failed ? (
          <div
            className="pfv-canvas"
            style={
              display.w ? { width: display.w, height: display.h } : undefined
            }
          >
            <img
              key={url}
              src={url}
              alt={node ? node.name : ''}
              draggable={false}
              style={
                natural
                  ? {
                      width: Math.round(natural.w * scale),
                      height: Math.round(natural.h * scale),
                      transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                    }
                  : { visibility: 'hidden' }
              }
              onLoad={e =>
                setNatural({
                  w: e.target.naturalWidth,
                  h: e.target.naturalHeight,
                })
              }
              onError={() => setFailed(true)}
            />
          </div>
        ) : (
          <div className="pfv-empty">No preview available.</div>
        )}
      </Stage>
      <Toolbar>
        {TOOL_BUTTONS.map(b =>
          b.type === 'separator' ? (
            <span key={b.key} className="pfv-sep" />
          ) : (
            <button
              key={b.key}
              type="button"
              className="pfv-btn"
              title={b.label}
              disabled={!enabled[b.key]}
              onClick={actions[b.key]}
            >
              <ToolIcon name={b.key} disabled={!enabled[b.key]} />
            </button>
          ),
        )}
      </Toolbar>
      {copyToOpen && (
        <FileDialog
          mode="save"
          title="Copy To"
          initialPath={getParentPath(current) || undefined}
          initialFileName={node ? node.name : ''}
          filters={COPY_FILTERS}
          onSelect={copyTo}
          onCancel={() => setCopyToOpen(false)}
        />
      )}
      {slideshow && (
        <Slideshow
          paths={siblings.length > 0 ? siblings : [current]}
          startIndex={Math.max(0, index)}
          resolveUrl={p => vfs.readFileUrl(p)}
          onClose={() => setSlideshow(false)}
        />
      )}
    </Container>
  );
}

const Container = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  /* Sampled off the reference screenshot */
  background: #eff2fc;
  overflow: hidden;
`;

const Stage = styled.div`
  flex: 1;
  min-height: 0;
  position: relative;
  /* Zoom past the window and XP hands you scrollbars to drag around with */
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 4px 4px 0;

  /* A box the exact size of the scaled picture, so the scroll extents match
     what is actually on screen. */
  .pfv-canvas {
    position: relative;
    flex-shrink: 0;
    margin: auto;
  }
  img {
    position: absolute;
    left: 50%;
    top: 50%;
    display: block;
    transform-origin: center center;
    user-select: none;
    -webkit-user-drag: none;
  }
  .pfv-empty {
    font-family: Tahoma, 'Noto Sans', sans-serif;
    font-size: 11px;
    color: #000;
    margin: auto;
  }
`;

const Toolbar = styled.div`
  flex-shrink: 0;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1px;

  .pfv-btn {
    width: 24px;
    height: 24px;
    padding: 0;
    border: 1px solid transparent;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: default;
    &:hover:not(:disabled) {
      border-color: #b6bdd2;
      background: rgba(255, 255, 255, 0.6);
    }
    &:active:not(:disabled) {
      border-color: #8f96ad;
      background: rgba(0, 0, 0, 0.05);
    }
    &:disabled {
      cursor: default;
    }
  }
  .pfv-sep {
    width: 1px;
    height: 16px;
    background: #b6bdd2;
    margin: 0 5px;
  }
`;

export default PictureViewer;
