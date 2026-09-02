import React, { useMemo } from 'react';
import { getCurrentUserName } from '../../../context/users';
import { SPECIAL_FOLDERS } from '../../../context/vfsConstants';
import { displayName, getTypeLabel } from './menus';
import { ItemIcon } from './styles';

/** The My Computer root, grouped as XP lays it out. Null inside a folder. */
export function useMyComputerData(vfs, inFolder) {
  return useMemo(() => {
    if (inFolder || !vfs.initialized) return null;

    const userFolders = [];
    const sharedDocs = vfs.getNode(SPECIAL_FOLDERS.SHARED_DOCUMENTS);
    if (sharedDocs)
      userFolders.push({ ...sharedDocs, displayName: 'Shared Documents' });
    const myDocs = vfs.getNode(SPECIAL_FOLDERS.MY_DOCUMENTS);
    if (myDocs)
      userFolders.push({
        ...myDocs,
        displayName: `${getCurrentUserName()}'s Documents`,
      });

    const hardDrives = [];
    const cDrive = vfs.getNode('C:/');
    if (cDrive) hardDrives.push({ ...cDrive, displayName: 'Local Disk (C:)' });

    const removable = [];
    const dDrive = vfs.getNode('D:/');
    if (dDrive) removable.push({ ...dDrive, displayName: 'CD Drive (D:)' });

    return { userFolders, hardDrives, removable };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inFolder, vfs.version, vfs.initialized]);
}

export const countMyComputerItems = data =>
  data
    ? data.userFolders.length + data.hardDrives.length + data.removable.length
    : 0;

/**
 * The grouped My Computer listing. Its items are always tiles, do not drag
 * out, and have no context menu; `itemProps` supplies what they do handle.
 */
export function MyComputerView({
  data,
  hideExt,
  selectedPaths,
  dropTargetPath,
  itemProps,
}) {
  if (!data) return null;
  const groups = [
    { label: 'Files Stored on This Computer', items: data.userFolders },
    { label: 'Hard Disk Drives', items: data.hardDrives },
    { label: 'Devices with Removable Storage', items: data.removable },
  ];
  return groups.map(group => {
    if (group.items.length === 0) return null;
    return (
      <div key={group.label} className="com__content__right__card">
        <div className="com__content__right__card__header">{group.label}</div>
        <div className="com__content__right__card__content">
          {group.items.map(node => (
            <div
              key={node.path}
              data-path={node.path}
              className={`com__view-tile ${
                selectedPaths.includes(node.path) ||
                dropTargetPath === node.path
                  ? 'selected'
                  : ''
              }`}
              {...itemProps(node)}
            >
              <ItemIcon
                node={node}
                src={node.iconLarge || node.icon}
                className="com__view-tile__img"
              />
              <div className="com__view-tile__text">
                <div className="com__view-tile__name">
                  {displayName(node, hideExt)}
                </div>
                <div className="com__view-tile__type">{getTypeLabel(node)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  });
}
