import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

import XPDialogFrame from '../XPDialogFrame';
import XPButton from '../XPButton';
import FileDialog from '../FileDialog';
import { useVFS } from '../../context/VFSContext';
import { useDialog } from '../../context/DialogContext';
import { getBaseName } from '../../context/vfsUtils';

/** Best-effort shortcut name for a web address ('example.com' style). */
function deriveUrlName(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, '');
    return host || 'New Internet Shortcut';
  } catch {
    return 'New Internet Shortcut';
  }
}

/**
 * The XP "Create Shortcut" wizard (New > Shortcut). Page 1 asks for the
 * item's location (VFS path or web address, Browse... via the shared file
 * dialog); page 2 names the shortcut. VFS targets become shortcut nodes
 * mirroring the target's icon; http(s) addresses become .url files.
 */
export default function ShortcutWizard({ initialDir, onClose }) {
  const vfs = useVFS();
  const dlg = useDialog();
  const [page, setPage] = useState(1);
  const [location, setLocation] = useState('');
  const [name, setName] = useState('');
  // Resolved on Next: { kind: 'vfs'|'url', value }
  const [target, setTarget] = useState(null);
  const [browseOpen, setBrowseOpen] = useState(false);
  const locationRef = useRef(null);
  const nameRef = useRef(null);

  useEffect(() => {
    const ref = page === 1 ? locationRef : nameRef;
    setTimeout(() => {
      if (ref.current) {
        ref.current.focus();
        ref.current.select();
      }
    }, 0);
  }, [page]);

  const goNext = () => {
    const raw = location.trim();
    const unquoted = raw.replace(/^"(.*)"$/, '$1').trim();
    if (!unquoted) return;
    if (/^https?:\/\//i.test(unquoted)) {
      setTarget({ kind: 'url', value: unquoted });
      setName(deriveUrlName(unquoted));
      setPage(2);
      return;
    }
    let p = unquoted.replace(/\\/g, '/').replace(/\/+$/, '');
    if (/^[A-Za-z]:$/.test(p)) p += '/';
    const node = vfs.findNodeCI(p);
    if (node) {
      setTarget({ kind: 'vfs', value: node.path });
      setName(node.name);
      setPage(2);
      return;
    }
    dlg.alert(
      `Windows cannot find '${raw}'. Make sure you typed the name correctly, and then try again.`,
      'Create Shortcut',
      { icon: 'warning' },
    );
  };

  const finish = () => {
    const chosen = name.trim();
    if (!chosen || !target) return;

    if (target.kind === 'url') {
      // Internet shortcut: a real .url file the shell already knows how
      // to open (association → Internet Explorer)
      const base = chosen.toLowerCase().endsWith('.url')
        ? chosen.slice(0, -4)
        : chosen;
      let fileName = `${base}.url`;
      let n = 2;
      while (vfs.findNodeCI(`${initialDir}/${fileName}`)) {
        fileName = `${base} (${n}).url`;
        n += 1;
      }
      vfs.createFile(
        `${initialDir}/${fileName}`,
        `[InternetShortcut]\r\nURL=${target.value}`,
      );
      onClose();
      return;
    }

    // VFS target: reuse the icon-mirroring helper, then take the chosen name
    const res = vfs.createShortcutTo(target.value, initialDir);
    if (!res.ok) {
      dlg.alert(`Windows cannot create a shortcut here.`, 'Create Shortcut', {
        icon: 'error',
      });
      return;
    }
    if (chosen !== getBaseName(res.path)) {
      const renamed = vfs.rename(res.path, chosen);
      if (!renamed.ok) {
        // Name taken/invalid: keep the auto name rather than losing the work
        dlg.alert(
          renamed.error === 'exists'
            ? `A shortcut named '${chosen}' already exists here. The shortcut was created as '${getBaseName(
                res.path,
              )}' instead.`
            : `The name '${chosen}' is not valid. The shortcut was created as '${getBaseName(
                res.path,
              )}' instead.`,
          'Create Shortcut',
          { icon: 'warning' },
        );
      }
    }
    onClose();
  };

  const onKeyDown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (page === 1) goNext();
      else finish();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <>
      <XPDialogFrame
        title="Create Shortcut"
        width={420}
        onClose={onClose}
        zIndex={99976}
      >
        <Body onKeyDown={onKeyDown}>
          {page === 1 ? (
            <>
              <div className="sw__blurb">
                This wizard helps you to create shortcuts to local or network
                programs, files, folders, computers, or Internet addresses.
              </div>
              <label className="sw__label" htmlFor="shortcut-wizard-location">
                Type the location of the item:
              </label>
              <div className="sw__row">
                <input
                  id="shortcut-wizard-location"
                  ref={locationRef}
                  className="sw__input"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  spellCheck={false}
                  autoComplete="off"
                />
                <XPButton onClick={() => setBrowseOpen(true)}>
                  Browse...
                </XPButton>
              </div>
              <div className="sw__hint">Click Next to continue.</div>
              <div className="sw__buttons">
                <XPButton disabled={!location.trim()} onClick={goNext}>
                  Next &gt;
                </XPButton>
                <XPButton onClick={onClose}>Cancel</XPButton>
              </div>
            </>
          ) : (
            <>
              <div className="sw__blurb">Select a Title for the Program</div>
              <label className="sw__label" htmlFor="shortcut-wizard-name">
                Type a name for this shortcut:
              </label>
              <div className="sw__row">
                <input
                  id="shortcut-wizard-name"
                  ref={nameRef}
                  className="sw__input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
              <div className="sw__hint">
                Click Finish to create the shortcut.
              </div>
              <div className="sw__buttons">
                <XPButton onClick={() => setPage(1)}>&lt; Back</XPButton>
                <XPButton disabled={!name.trim()} onClick={finish}>
                  Finish
                </XPButton>
                <XPButton onClick={onClose}>Cancel</XPButton>
              </div>
            </>
          )}
        </Body>
      </XPDialogFrame>
      {browseOpen && (
        <FileDialog
          mode="open"
          title="Browse"
          filters={[{ label: 'All Files (*.*)', extensions: null }]}
          onSelect={path => {
            setBrowseOpen(false);
            setLocation(path.replace(/\//g, '\\'));
            if (locationRef.current) locationRef.current.focus();
          }}
          onCancel={() => setBrowseOpen(false)}
        />
      )}
    </>
  );
}

const Body = styled.div`
  padding: 14px 12px 12px;
  font-size: 11px;
  font-family: Tahoma, 'Noto Sans', sans-serif;

  .sw__blurb {
    line-height: 15px;
    margin-bottom: 14px;
  }
  .sw__label {
    display: block;
    margin-bottom: 4px;
  }
  .sw__row {
    display: flex;
    gap: 6px;
    margin-bottom: 14px;
  }
  .sw__input {
    flex: 1;
    height: 21px;
    border: 1px solid var(--xp-select-border, #7f9db9);
    padding: 2px 4px;
    font-family: Tahoma, 'Noto Sans', sans-serif;
    font-size: 11px;
    outline: none;
  }
  .sw__hint {
    color: #444;
    margin-bottom: 16px;
  }
  .sw__buttons {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    border-top: 1px solid #d8d2bd;
    padding-top: 10px;
  }
`;
