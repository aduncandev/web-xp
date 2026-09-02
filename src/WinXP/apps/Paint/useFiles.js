// Files: the picture's path, whether it has unsaved changes, opening and
// saving through the filesystem, and the "Save changes?" question the
// window asks before it closes.
import { useEffect, useRef, useState } from 'react';
import { getExtension } from '../../../context/vfsUtils';
import { getCurrentUserName } from '../../../context/users';
import { DEFAULT_SIZE } from './constants';
import { encodeBMP } from './raster';

export function useFiles({
  paint,
  vfs,
  dlg,
  filePath,
  registerCloseInterceptor,
  titleFor,
}) {
  const [currentPath, setCurrentPath] = useState(null);
  const fileTitle = currentPath ? titleFor(currentPath) : 'untitled';
  const [dirty, setDirty] = useState(false);
  const [fileDialog, setFileDialog] = useState(null); // { mode, resolve }

  const openSaveDialog = () =>
    new Promise(resolve => setFileDialog({ mode: 'save', resolve }));
  const openOpenDialog = () =>
    new Promise(resolve => setFileDialog({ mode: 'open', resolve }));

  /** A blank page: nothing selected, nothing in progress, no history. */
  function freshPage(w, h, color) {
    paint.selection.discard();
    paint.text.cancelText();
    paint.cancelInProgress();
    paint.doc.resetHistory();
    paint.doc.setPhysicalSize(w, h);
    const ctx = paint.doc.ctx2d();
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
  }

  async function loadImageFromPath(path) {
    const node = vfs.getNode(path);
    if (!node || node.type !== 'file') return false;
    let blob = null;
    try {
      if (node.hasBinaryContent) {
        blob = await vfs.readBinaryFile(path);
      } else if (node.sourceUrl) {
        const res = await fetch(node.sourceUrl);
        if (res.ok) blob = await res.blob();
      }
      if (!blob) return false;
      const bmp = await createImageBitmap(blob);
      freshPage(bmp.width, bmp.height, '#FFFFFF');
      paint.doc.ctx2d().drawImage(bmp, 0, 0);
      paint.setZoom(1);
      setDirty(false);
      paint.redrawOverlay();
      return true;
    } catch {
      return false;
    }
  }

  // A file double-clicked in Explorer or on the desktop arrives as filePath
  const loadedInjectedPath = useRef(null);
  useEffect(() => {
    if (!filePath || !vfs.initialized) return;
    if (loadedInjectedPath.current === filePath) return;
    loadedInjectedPath.current = filePath;
    (async () => {
      if (await loadImageFromPath(filePath)) {
        setCurrentPath(filePath);
        vfs.addRecentDocument(filePath);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath, vfs.initialized]);

  /** Save to the current path or ask for one. Resolves the saved path, or null. */
  async function doSave(forceDialog = false) {
    paint.text.commitText();
    paint.selection.commit();
    let targetPath = currentPath;
    if (!targetPath || forceDialog) {
      targetPath = await openSaveDialog();
      if (!targetPath) return null;
    }
    const ext = (getExtension(targetPath) || '.bmp').toLowerCase();
    const c = paint.doc.canvasRef.current;
    let blob;
    let mime;
    if (ext === '.png') {
      mime = 'image/png';
      blob = await new Promise(res => c.toBlob(res, 'image/png'));
    } else {
      mime = 'image/bmp';
      blob = encodeBMP(paint.doc.ctx2d().getImageData(0, 0, c.width, c.height));
    }
    if (!blob) return null;
    if (!vfs.exists(targetPath)) vfs.createFile(targetPath, '', mime);
    await vfs.writeBinaryFile(targetPath, blob, mime);
    vfs.addRecentDocument(targetPath);
    setCurrentPath(targetPath);
    setDirty(false);
    return targetPath;
  }

  /** Ask about unsaved changes. Resolves true when it is OK to proceed. */
  async function confirmDiscard() {
    if (!dirty) return true;
    const res = await dlg.confirm3(`Save changes to ${fileTitle}?`, 'Paint');
    if (res === 'cancel') return false;
    if (res === 'no') return true;
    return !!(await doSave());
  }

  const confirmDiscardRef = useRef(confirmDiscard);
  confirmDiscardRef.current = confirmDiscard;
  useEffect(() => {
    if (registerCloseInterceptor) {
      registerCloseInterceptor(() => confirmDiscardRef.current());
    }
  }, [registerCloseInterceptor]);

  async function doNew() {
    if (!(await confirmDiscard())) return;
    freshPage(DEFAULT_SIZE.w, DEFAULT_SIZE.h, paint.live.current.bg);
    setCurrentPath(null);
    setDirty(false);
    paint.setZoom(1);
    paint.redrawOverlay();
  }

  async function doOpen() {
    if (!(await confirmDiscard())) return;
    const path = await openOpenDialog();
    if (!path) return;
    if (await loadImageFromPath(path)) {
      setCurrentPath(path);
      vfs.addRecentDocument(path);
    } else {
      await dlg.alert(
        `${path}\nPaint cannot read this file.\nThis is not a valid bitmap file, or its format is not currently supported.`,
        'Paint',
      );
    }
  }

  /** File > Set As Background: the saved picture becomes the wallpaper. */
  async function setAsBackground(position) {
    let path = currentPath;
    if (!path) return;
    if (dirty) {
      path = await doSave();
      if (!path) return;
    }
    try {
      vfs.setUserConfigFor(getCurrentUserName(), 'wallpaper', {
        kind: 'vfs',
        value: path,
        position,
      });
    } catch {
      // user settings unavailable, ignored like a failed SPI call
    }
  }

  return {
    currentPath,
    fileTitle,
    dirty,
    setDirty,
    fileDialog,
    setFileDialog,
    doSave,
    doNew,
    doOpen,
    setAsBackground,
  };
}
