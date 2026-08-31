import React, { useState, useCallback, useRef } from 'react';

import ContextMenu from '../ContextMenu';

const isTextField = el => el.tagName === 'INPUT' || el.tagName === 'TEXTAREA';

/**
 * The standard XP edit-control context menu: Undo / Cut / Copy / Paste /
 * Delete / Select All, with the stock graying rules (Undo without an undo
 * stack, Cut/Copy/Delete without a selection, Paste with an empty
 * clipboard). Works on <input>, <textarea>, and contentEditable hosts.
 *
 * Usage:
 *   const { openEditContextMenu, editContextMenu } = useEditContextMenu();
 *   <input onContextMenu={openEditContextMenu} />
 *   {editContextMenu}
 */
export default function useEditContextMenu() {
  const [menu, setMenu] = useState(null);
  const targetRef = useRef(null);
  const savedSelectionRef = useRef(null);

  // Clicking a menu item blurs the control; put focus and the selection
  // back before running the command.
  const restoreTarget = useCallback(() => {
    const target = targetRef.current;
    if (!target) return null;
    target.focus();
    const saved = savedSelectionRef.current;
    if (isTextField(target)) {
      if (saved) {
        try {
          target.setSelectionRange(saved.start, saved.end, saved.direction);
        } catch {
          // input type without selection support
        }
      }
    } else if (saved) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(saved);
      }
    }
    return target;
  }, []);

  const openEditContextMenu = useCallback(e => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    targetRef.current = target;

    let hasSelection = false;
    if (isTextField(target)) {
      savedSelectionRef.current = {
        start: target.selectionStart,
        end: target.selectionEnd,
        direction: target.selectionDirection,
      };
      hasSelection = target.selectionStart !== target.selectionEnd;
    } else {
      const sel = window.getSelection();
      const inTarget =
        !!sel && sel.rangeCount > 0 && target.contains(sel.anchorNode);
      savedSelectionRef.current = inTarget
        ? sel.getRangeAt(0).cloneRange()
        : null;
      hasSelection = inTarget && !sel.isCollapsed;
    }

    let canUndo = false;
    try {
      canUndo = document.queryCommandEnabled('undo');
    } catch {
      // stays grayed
    }

    setMenu({
      x: e.clientX,
      y: e.clientY,
      canUndo,
      hasSelection,
      canPaste: true,
    });

    // Gray Paste only when the clipboard is readable without prompting
    // and is provably empty.
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'clipboard-read' })
        .then(status => {
          if (status.state !== 'granted' || !navigator.clipboard) return null;
          return navigator.clipboard.readText().then(text => {
            setMenu(m => (m ? { ...m, canPaste: text.length > 0 } : m));
          });
        })
        .catch(() => {});
    }
  }, []);

  const onAction = useCallback(
    action => {
      const target = restoreTarget();
      if (!target) return;
      switch (action) {
        case 'undo':
          document.execCommand('undo');
          break;
        case 'cut':
          document.execCommand('cut');
          break;
        case 'copy':
          document.execCommand('copy');
          break;
        case 'paste':
          if (navigator.clipboard && navigator.clipboard.readText) {
            navigator.clipboard
              .readText()
              .then(text => {
                if (text && restoreTarget()) {
                  document.execCommand('insertText', false, text);
                }
              })
              .catch(() => {
                // clipboard access denied — Paste does nothing
              });
          }
          break;
        case 'delete':
          document.execCommand('delete');
          break;
        case 'selectAll':
          if (isTextField(target)) target.select();
          else document.execCommand('selectAll');
          break;
        default:
      }
    },
    [restoreTarget],
  );

  const editContextMenu = menu ? (
    <ContextMenu
      x={menu.x}
      y={menu.y}
      items={[
        { label: 'Undo', action: 'undo', disabled: !menu.canUndo },
        { type: 'separator' },
        { label: 'Cut', action: 'cut', disabled: !menu.hasSelection },
        { label: 'Copy', action: 'copy', disabled: !menu.hasSelection },
        { label: 'Paste', action: 'paste', disabled: !menu.canPaste },
        { label: 'Delete', action: 'delete', disabled: !menu.hasSelection },
        { type: 'separator' },
        { label: 'Select All', action: 'selectAll' },
      ]}
      onAction={onAction}
      onClose={() => setMenu(null)}
    />
  ) : null;

  return { openEditContextMenu, editContextMenu };
}
