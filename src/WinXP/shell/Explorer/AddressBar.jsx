import React, { useEffect, useMemo, useState } from 'react';
import { useVFS } from '../../../context/VFSContext';
import { useDialog } from '../../../context/DialogContext';
import { getCurrentUserName, listUsers } from '../../../context/users';
import {
  SPECIAL_FOLDERS,
  computerIcon,
  profileFoldersFor,
} from '../../../context/vfsConstants';
import {
  MY_COMPUTER,
  RECYCLE_BIN,
  CONTROL_PANEL,
  resolveLocation,
} from '../location';
import { getArt } from '../../../xpArt';

import go from 'assets/windowsIcons/290.png';
import control from 'assets/windowsIcons/300(16x16).png';
import network from 'assets/windowsIcons/693(16x16).png';
import documentIcon from 'assets/windowsIcons/308(16x16).png';
import desktopIconSvg from 'assets/windowsIcons/desktop.svg';

/**
 * The address bar's list drops the shell namespace, not the current path's
 * ancestors: Desktop at the root with My Documents, My Computer and its
 * drives, the shared and other users' document folders, then My Network
 * Places and the Recycle Bin.
 */
function quickLinks(vfs) {
  const indent = depth => 8 + depth * 12;
  const links = [
    {
      label: 'Desktop',
      icon: getArt('Desktop16', getArt('Desktop', desktopIconSvg)),
      path: SPECIAL_FOLDERS.DESKTOP,
      indentPx: indent(0),
    },
    {
      label: 'My Documents',
      icon: getArt('MyDocuments16', documentIcon),
      path: SPECIAL_FOLDERS.MY_DOCUMENTS,
      indentPx: indent(1),
    },
    {
      label: MY_COMPUTER,
      icon: computerIcon,
      path: MY_COMPUTER,
      indentPx: indent(1),
    },
  ];
  for (const drivePath of ['C:/', 'D:/']) {
    const node = vfs.getNode(drivePath);
    if (node)
      links.push({
        label: `${node.driveLabel || 'Local Disk'} (${node.name})`,
        icon: node.icon,
        path: node.path,
        indentPx: indent(2),
      });
  }
  links.push({
    label: CONTROL_PANEL,
    icon: control,
    path: CONTROL_PANEL,
    indentPx: indent(2),
  });
  const shared = SPECIAL_FOLDERS.SHARED_DOCUMENTS;
  if (vfs.exists(shared)) {
    links.push({
      label: 'Shared Documents',
      icon: getArt('SharedFolder', documentIcon),
      path: shared,
      indentPx: indent(1),
    });
  }
  // Every other profile's documents, as the shell lists them
  const me = getCurrentUserName();
  for (const user of listUsers()) {
    if (!user || user.name === me) continue;
    const docs = profileFoldersFor(user.name).MY_DOCUMENTS;
    if (!vfs.exists(docs)) continue;
    links.push({
      label: `${user.name}'s Documents`,
      icon: getArt('MyDocuments16', documentIcon),
      path: docs,
      indentPx: indent(1),
    });
  }
  links.push({
    label: 'My Network Places',
    icon: getArt('MyNetworkPlaces', network),
    indentPx: indent(1),
  });
  links.push({
    label: RECYCLE_BIN,
    icon: getArt('recycle-empty', documentIcon),
    path: RECYCLE_BIN,
    indentPx: indent(1),
  });
  return links;
}

/** Explorer's Address row: the editable path, its drop-down and Go. */
export default function AddressBar({ address, icon, onNavigate }) {
  const vfs = useVFS();
  const dlg = useDialog();
  const [input, setInput] = useState(address);
  const [open, setOpen] = useState(false);

  // Follow the window when it moves
  useEffect(() => {
    setInput(address);
    setOpen(false);
  }, [address]);

  // The list closes on any click that is not inside it
  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  const links = useMemo(
    () => quickLinks(vfs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vfs.version],
  );

  const submit = e => {
    if (e) e.preventDefault();
    let path = input.replace(/\\/g, '/').trim();
    if (path.toLowerCase() === 'my computer' || path === MY_COMPUTER) {
      onNavigate(MY_COMPUTER);
      return;
    }
    if (/^recycle bin$/i.test(path)) path = RECYCLE_BIN;
    if (/^control panel$/i.test(path)) path = CONTROL_PANEL;
    if (/^[A-Za-z]:$/.test(path)) path += '/';
    if (path.length > 3 && path.endsWith('/')) path = path.slice(0, -1);
    if (resolveLocation(vfs, path).exists) {
      onNavigate(path);
    } else {
      dlg.alert(
        `Windows cannot find '${input.trim()}'. Check the spelling and try again, or try searching for the item by clicking the Start button and then clicking Search.`,
        'My Computer',
      );
    }
  };

  return (
    <form className="com__address_bar" onSubmit={submit}>
      <div className="com__address_bar__title">Address</div>
      <div className="com__address_bar__content">
        <img src={icon} alt="icon" className="com__address_bar__content__img" />
        <input
          className="com__address_bar__input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') submit(e);
          }}
          spellCheck={false}
        />
        <span
          role="button"
          aria-label="dropdown"
          className="com__address_bar__content__dropdown"
          onClick={e => {
            e.stopPropagation();
            setOpen(o => !o);
          }}
        />
        {open && (
          <div
            className="com__address_bar__dropdown-list"
            onClick={e => e.stopPropagation()}
          >
            {links.map(link => (
              <div
                key={link.label}
                className="com__address_bar__dropdown-item"
                style={
                  link.indentPx ? { paddingLeft: link.indentPx } : undefined
                }
                onClick={() => {
                  setOpen(false);
                  if (link.path) onNavigate(link.path);
                }}
              >
                <img src={link.icon} alt="" />
                <span>{link.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="com__address_bar__go" onClick={submit}>
        <img className="com__address_bar__go__img" src={go} alt="Go" />
        <span className="com__address_bar__go__text">Go</span>
      </div>
    </form>
  );
}
