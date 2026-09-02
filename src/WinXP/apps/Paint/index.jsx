/*
 * Paint. The picture is a canvas with an overlay for previews; the tools
 * draw straight onto it and the undo history is a stack of pixel
 * snapshots. This file holds the tool and view state and wires the parts:
 * useDocument (the canvases and history), useSelection, useTextTool,
 * useFiles, the tool table in tools.js, the Image menu in imageOps.js, the
 * shortcuts, and the toolbox, color box and page components.
 */
import React, { useState, useEffect, useRef } from 'react';

import { WindowDropDowns } from 'components';
import FileDialog from '../../../components/FileDialog';
import { useVFS } from '../../../context/VFSContext';
import { useExplorerView } from '../../shell/useExplorerView';
import { useDialog } from '../../../context/DialogContext';
import { SPECIAL_FOLDERS } from '../../../context/vfsConstants';
import { getBaseName } from '../../../context/vfsUtils';
import { displayName } from '../../shell/fileTypes';

import toolsStrip from 'assets/paint/tools.png';

import { DEFAULT_PALETTE, TOOLS, DEFAULT_SIZE, OPEN_FILTERS, SAVE_FILTERS } from './constants';
import { AttributesDialog, FlipRotateDialog, StretchSkewDialog } from './dialogs';
import { Div } from './styles';
import { buildPaintMenus } from './menus';
import { useDocument } from './useDocument';
import { useSelection } from './useSelection';
import { useTextTool } from './useTextTool';
import { useFiles } from './useFiles';
import {
  onCanvasMouseDown,
  onCanvasHover,
  onCanvasLeave,
  onCanvasDoubleClick,
} from './tools';
import {
  applyStretch,
  applyTransform,
  clearImage,
  invertColors,
  resizeCanvasTo,
  startCanvasResize,
} from './imageOps';
import { handleShortcut } from './shortcuts';
import ToolOptions from './ToolOptions';
import ColorBox from './ColorBox';
import PaintCanvas from './PaintCanvas';

export default function Paint({
  onClose,
  onSetHeader,
  registerCloseInterceptor,
  isFocus,
  filePath,
}) {
  const vfs = useVFS();
  const dlg = useDialog();

  // --- Tool state ---
  const [tool, setTool] = useState('pencil');
  const [fg, setFg] = useState('#000000');
  const [bg, setBg] = useState('#FFFFFF');
  const [palette, setPalette] = useState(DEFAULT_PALETTE);
  const [lineWidth, setLineWidth] = useState(1);
  const [brush, setBrush] = useState({ shape: 'circle', size: 4 });
  const [eraserSize, setEraserSize] = useState(8);
  const [airbrushSize, setAirbrushSize] = useState(16);
  const [shapeMode, setShapeMode] = useState('outline'); // outline | both | fill
  const [transparentSelect, setTransparentSelect] = useState(false);
  const [magLevel, setMagLevel] = useState(8);
  const [zoom, setZoom] = useState(1);

  // --- View state ---
  const [showToolBox, setShowToolBox] = useState(true);
  const [showColorBox, setShowColorBox] = useState(true);
  const [showStatusBar, setShowStatusBar] = useState(true);
  const [statusPos, setStatusPos] = useState('');
  const [statusSize, setStatusSize] = useState('');
  const [subDialog, setSubDialog] = useState(null); // attributes | fliprotate | stretch

  // --- Interaction state ---
  const [marquee, setMarquee] = useState(null); // drag preview rect
  const [resizeGhost, setResizeGhost] = useState(null);
  const colorInputRef = useRef(null);
  const curveRef = useRef(null);
  const polyRef = useRef(null);
  const dragRef = useRef(false);
  const prevToolRef = useRef('pencil');
  const editSlotRef = useRef(0);
  const apiRef = useRef({});

  const doc = useDocument();

  // Live mirror of state for handlers attached to window (avoids staleness)
  const live = useRef({});

  // The bag every tool and operation works through; refilled each render
  // so it always carries the current setters and state
  const paint = useRef({}).current;
  const setDirty = value => paint.setDirty(value);
  const selection = useSelection({ doc, live, setDirty, setStatusSize });
  const text = useTextTool({ doc, live, setDirty });

  live.current = {
    tool,
    zoom,
    fg,
    bg,
    transparentSelect,
    canvasSize: doc.canvasSize,
    textBox: text.textBox,
    textValue: text.textValue,
    lineWidth,
    brush,
    eraserSize,
    airbrushSize,
    magLevel,
    shapeMode,
  };

  function cancelInProgress() {
    curveRef.current = null;
    polyRef.current = null;
    selection.redrawOverlay();
  }
  /** Finish anything half done: pending text, a floating selection, a curve or polygon. */
  function settle() {
    text.commitText();
    selection.commit();
    cancelInProgress();
  }

  Object.assign(paint, {
    doc,
    live,
    selection,
    text,
    curveRef,
    polyRef,
    dragRef,
    prevToolRef,
    redrawOverlay: selection.redrawOverlay,
    cancelInProgress,
    settle,
    setStatusPos,
    setStatusSize,
    setMarquee,
    setResizeGhost,
    setFg,
    setBg,
    setZoom,
    setTool,
  });

  // 'Hide extensions for known file types': the XP default is on
  const { hideExt } = useExplorerView();
  const files = useFiles({
    paint,
    vfs,
    dlg,
    filePath,
    registerCloseInterceptor,
    titleFor: path => displayName(vfs.getNode(path), hideExt) || getBaseName(path),
  });
  paint.setDirty = files.setDirty;
  const { currentPath, fileTitle } = files;

  useEffect(() => {
    if (onSetHeader) onSetHeader({ title: `${fileTitle} - Paint` });
  }, [fileTitle, onSetHeader]);

  // Blank white page on mount; an injected file may replace it right after
  useEffect(() => {
    doc.setPhysicalSize(DEFAULT_SIZE.w, DEFAULT_SIZE.h);
    const ctx = doc.ctx2d();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, DEFAULT_SIZE.w, DEFAULT_SIZE.h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-filter the floating selection when the transparency mode flips
  useEffect(() => {
    selection.redrawOverlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transparentSelect, bg]);

  // --- Undo and redo, around whatever was in progress ---

  function doUndo() {
    cancelInProgress();
    selection.discard();
    if (!doc.undo()) return;
    files.setDirty(true);
    selection.redrawOverlay();
  }

  function doRedo() {
    cancelInProgress();
    selection.discard();
    if (!doc.redo()) return;
    files.setDirty(true);
    selection.redrawOverlay();
  }

  // --- Edit menu verbs, settling first where Paint did ---

  function ensureSelectTool() {
    if (live.current.tool !== 'select' && live.current.tool !== 'freeform')
      setTool('select');
  }
  function pasteClipboard() {
    if (!selection.hasClipboard) return;
    settle();
    ensureSelectTool();
    selection.paste();
  }
  function selectAll() {
    settle();
    ensureSelectTool();
    selection.selectAll();
  }

  function selectTool(t) {
    if (t === live.current.tool) return;
    settle();
    if (t === 'picker' && live.current.tool !== 'picker') {
      prevToolRef.current = live.current.tool;
    }
    setTool(t);
  }

  function openColorEditor(slot) {
    editSlotRef.current = slot;
    const input = colorInputRef.current;
    if (!input) return;
    input.value = palette[slot] || '#000000';
    input.click();
  }

  // --- Menu bar ---

  const menus = buildPaintMenus({
    currentPath,
    stackLen: doc.stackLen,
    hasSelection: selection.hasSelection,
    hasClipboard: selection.hasClipboard,
    showToolBox,
    showColorBox,
    showStatusBar,
    transparentSelect,
  });

  function onMenuItem(item) {
    const actions = {
      New: files.doNew,
      'Open...': files.doOpen,
      Save: () => files.doSave(),
      'Save As...': () => files.doSave(true),
      'Set As Background (Tiled)': () => files.setAsBackground('tile'),
      'Set As Background (Centered)': () => files.setAsBackground('center'),
      Exit: onClose,
      Undo: doUndo,
      Repeat: doRedo,
      Cut: selection.cut,
      Copy: selection.copy,
      Paste: pasteClipboard,
      'Clear Selection': selection.clear,
      'Select All': selectAll,
      'Tool Box': () => setShowToolBox(!showToolBox),
      'Color Box': () => setShowColorBox(!showColorBox),
      'Status Bar': () => setShowStatusBar(!showStatusBar),
      'Normal Size': () => setZoom(1),
      'Large Size': () => setZoom(4),
      'Flip/Rotate...': () => setSubDialog('fliprotate'),
      'Stretch/Skew...': () => setSubDialog('stretch'),
      'Invert Colors': () => invertColors(paint),
      'Attributes...': () => setSubDialog('attributes'),
      'Clear Image': () => clearImage(paint),
      'Draw Opaque': () => setTransparentSelect(!transparentSelect),
      'Edit Colors...': () => openColorEditor(editSlotRef.current),
      'About Paint': () =>
        dlg.alert('Paint for Windows XP\nVersion 2026 (Web Remake)', 'About Paint'),
    };
    if (actions[item]) actions[item]();
  }

  // --- Keyboard shortcuts ---

  apiRef.current.handleKey = e =>
    handleShortcut(e, {
      textBoxOpen: !!live.current.textBox,
      cancelText: text.cancelText,
      toolInProgress: !!(polyRef.current || curveRef.current),
      cancelInProgress,
      hasSelection: !!selection.selRef.current,
      commitSelection: selection.commit,
      clearSelection: selection.clear,
      undo: doUndo,
      redo: doRedo,
      setZoom,
      selectAll,
      cut: selection.cut,
      copy: selection.copy,
      paste: pasteClipboard,
      clearImage: () => clearImage(paint),
      doNew: files.doNew,
      doOpen: files.doOpen,
      doSave: files.doSave,
      openDialog: setSubDialog,
      invertColors: () => invertColors(paint),
      toggleToolBox: () => setShowToolBox(s => !s),
      toggleColorBox: () => setShowColorBox(s => !s),
    });

  useEffect(() => {
    if (!isFocus) return undefined;
    const f = e => apiRef.current.handleKey(e);
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [isFocus]);

  // --- Render ---

  const cursorForTool =
    tool === 'text' ? 'text' : tool === 'magnifier' ? 'zoom-in' : 'crosshair';

  return (
    <Div>
      <input
        type="color"
        ref={colorInputRef}
        style={{
          position: 'absolute',
          width: 0,
          height: 0,
          opacity: 0,
          pointerEvents: 'none',
        }}
        onChange={e => {
          const slot = editSlotRef.current;
          const color = e.target.value.toUpperCase();
          setPalette(p => p.map((c, i) => (i === slot ? color : c)));
          setFg(color);
        }}
        tabIndex={-1}
      />
      <section className="paint__menubar">
        <WindowDropDowns items={menus} onClickItem={onMenuItem} />
      </section>
      <div className="paint__mid">
        {showToolBox && (
          <div className="paint__toolbox">
            <div className="paint__tools">
              {TOOLS.map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  title={t.name}
                  className={`paint__tool${
                    tool === t.id ? ' paint__tool--active' : ''
                  }`}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => selectTool(t.id)}
                >
                  <span
                    className="paint__tool-glyph"
                    style={{
                      backgroundImage: `url(${toolsStrip})`,
                      backgroundPosition: `-${i * 16}px 0`,
                    }}
                  />
                </button>
              ))}
            </div>
            <div className="paint__options">
              <ToolOptions
                tool={tool}
                options={{
                  lineWidth,
                  shapeMode,
                  brush,
                  eraserSize,
                  airbrushSize,
                  zoom,
                  transparentSelect,
                }}
                set={{
                  lineWidth: setLineWidth,
                  shapeMode: setShapeMode,
                  brush: setBrush,
                  eraserSize: setEraserSize,
                  airbrushSize: setAirbrushSize,
                  zoom: setZoom,
                  magLevel: setMagLevel,
                  transparentSelect: setTransparentSelect,
                }}
              />
            </div>
          </div>
        )}
        <PaintCanvas
          doc={doc}
          zoom={zoom}
          cursor={cursorForTool}
          onMouseDown={e => onCanvasMouseDown(paint, e)}
          onMouseMove={e => onCanvasHover(paint, e)}
          onMouseLeave={() => onCanvasLeave(paint)}
          onDoubleClick={() => onCanvasDoubleClick(paint)}
          onAreaMouseDown={e => {
            // Clicking the gray surround commits pending text, like Paint
            if (e.target === e.currentTarget && live.current.textBox)
              text.commitText();
          }}
          selection={selection}
          marquee={marquee}
          text={text}
          fg={fg}
          bg={bg}
          transparentSelect={transparentSelect}
          resizeGhost={resizeGhost}
          onResizeStart={(e, dir) => startCanvasResize(paint, e, dir)}
        />
      </div>
      {showColorBox && (
        <ColorBox
          fg={fg}
          bg={bg}
          palette={palette}
          onPickFg={(color, i) => {
            setFg(color);
            editSlotRef.current = i;
          }}
          onPickBg={setBg}
          onEdit={openColorEditor}
        />
      )}
      {showStatusBar && (
        <div className="paint__status">
          <div className="paint__status-help">
            For Help, click Help Topics on the Help Menu.
          </div>
          <div className="paint__status-pane">{statusPos}</div>
          <div className="paint__status-pane">{statusSize}</div>
        </div>
      )}
      {files.fileDialog && (
        <FileDialog
          mode={files.fileDialog.mode}
          initialPath={
            currentPath
              ? currentPath.slice(0, currentPath.lastIndexOf('/'))
              : SPECIAL_FOLDERS.MY_PICTURES || SPECIAL_FOLDERS.MY_DOCUMENTS
          }
          initialFileName={
            files.fileDialog.mode === 'save'
              ? currentPath
                ? getBaseName(currentPath)
                : 'untitled'
              : ''
          }
          filters={files.fileDialog.mode === 'save' ? SAVE_FILTERS : OPEN_FILTERS}
          defaultExtension=".bmp"
          onSelect={path => {
            files.fileDialog.resolve(path);
            files.setFileDialog(null);
          }}
          onCancel={() => {
            files.fileDialog.resolve(null);
            files.setFileDialog(null);
          }}
        />
      )}
      {subDialog === 'attributes' && (
        <AttributesDialog
          width={doc.canvasSize.w}
          height={doc.canvasSize.h}
          onOK={(w, h) => {
            setSubDialog(null);
            resizeCanvasTo(paint, w, h);
          }}
          onCancel={() => setSubDialog(null)}
        />
      )}
      {subDialog === 'fliprotate' && (
        <FlipRotateDialog
          onOK={kind => {
            setSubDialog(null);
            applyTransform(paint, kind);
          }}
          onCancel={() => setSubDialog(null)}
        />
      )}
      {subDialog === 'stretch' && (
        <StretchSkewDialog
          onOK={(hPct, vPct) => {
            setSubDialog(null);
            applyStretch(paint, hPct, vPct);
          }}
          onCancel={() => setSubDialog(null)}
        />
      )}
    </Div>
  );
}
