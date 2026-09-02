// Paint's keyboard: Escape backs out of whatever is in progress, Delete
// clears the selection, F4 repeats, and the Ctrl chords map to the menus.

export function handleShortcut(e, a) {
  const tag = e.target && e.target.tagName;
  const inField = tag === 'INPUT' || tag === 'TEXTAREA';
  if (e.key === 'Escape') {
    if (a.textBoxOpen) {
      a.cancelText();
      return;
    }
    if (inField) return;
    if (a.toolInProgress) {
      a.cancelInProgress();
      return;
    }
    if (a.hasSelection) a.commitSelection();
    return;
  }
  if (inField) return;
  if (e.key === 'Delete') {
    a.clearSelection();
    return;
  }
  if (e.key === 'F4') {
    e.preventDefault();
    a.redo();
    return;
  }
  if (!e.ctrlKey) return;
  if (e.key === 'PageUp') {
    e.preventDefault();
    a.setZoom(1);
    return;
  }
  if (e.key === 'PageDown') {
    e.preventDefault();
    a.setZoom(4);
    return;
  }
  const k = e.key.toLowerCase();
  const actions = {
    z: a.undo,
    y: a.redo,
    a: a.selectAll,
    x: a.cut,
    c: a.copy,
    v: a.paste,
    n: () => (e.shiftKey ? a.clearImage() : a.doNew()),
    o: a.doOpen,
    s: () => a.doSave(e.shiftKey),
    e: () => a.openDialog('attributes'),
    r: () => a.openDialog('fliprotate'),
    w: () => a.openDialog('stretch'),
    i: a.invertColors,
    t: a.toggleToolBox,
    l: a.toggleColorBox,
  };
  if (actions[k]) {
    e.preventDefault();
    actions[k]();
  }
}
