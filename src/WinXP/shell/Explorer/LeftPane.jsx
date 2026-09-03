import React from 'react';
import { EXE_PATHS, SPECIAL_FOLDERS } from '../../../context/vfsConstants';
import {
  formatSize,
  getParentPath,
  normalizePath,
} from '../../../context/vfsUtils';
import { getArt } from '../../../xpArt';
import { CONTROL_PANEL, MY_COMPUTER } from '../location';
import { displayName, getTypeLabel } from './menus';
import { TaskCard, taskRow } from './TaskPane';
import { placeName } from './contextMenus';

import zipTaskIcon from 'assets/windowsIcons/zipfldr(16x16).png';
import search from 'assets/windowsIcons/299(32x32).png';
import viewInfo from 'assets/windowsIcons/shell32-1007(16x16).png';
import remove from 'assets/windowsIcons/302(16x16).png';
import network from 'assets/windowsIcons/693(16x16).png';
import documentIcon from 'assets/windowsIcons/308(16x16).png';
import folderSmall from 'assets/windowsIcons/318(16x16).png';
import newFolderIcon from 'assets/windowsIcons/new-folder(16x16).png';
import publishIcon from 'assets/windowsIcons/publish(16x16).png';
import shareIcon from 'assets/windowsIcons/shell32-267(16x16).png';
import desktopTaskIcon from 'assets/windowsIcons/shell32-35(16x16).png';
import sharedDocsIcon from 'assets/windowsIcons/shell32-4(16x16).png';
import computerTaskIcon from 'assets/windowsIcons/shell32-16(16x16).png';
import networkPlacesIcon from 'assets/windowsIcons/shell32-18(16x16).png';
import controlPanelIcon from 'assets/windowsIcons/shell32-22(16x16).png';
import myDocsIcon from 'assets/windowsIcons/shell32-235(16x16).png';
import addRemoveIcon from 'assets/windowsIcons/appwiz-1500(16x16).png';

const text = (content, bold) => (
  <div className={`com__content__left__card__text${bold ? ' bold' : ''}`}>
    {content}
  </div>
);

/**
 * The shell folder's own card, above File and Folder Tasks: the bin's
 * verbs, an archive's Extract, and the Music and Picture tasks. My Videos
 * gets no card of its own; the real shell only shows File and Folder Tasks
 * there.
 */
function shellFolderCard(p, card) {
  if (p.inRecycleBin) {
    const { items, selectedPaths, recycle } = p;
    const restoreAll = async () => {
      for (const item of items) {
        // eslint-disable-next-line no-await-in-loop
        await recycle.restore(item.path);
      }
    };
    const restoreSelected = async () => {
      for (const path of selectedPaths) {
        // eslint-disable-next-line no-await-in-loop
        await recycle.restore(path);
      }
      p.clearSelection();
    };
    return card(
      'recycle-tasks',
      'Recycle Bin Tasks',
      <>
        {taskRow(
          getArt('recycle-empty16', getArt('recycle-empty', null)),
          'Empty the Recycle Bin',
          items.length ? () => recycle.emptyBin(items) : undefined,
        )}
        {selectedPaths.length === 0 &&
          taskRow(
            getArt('recycle-full16', getArt('recycle-full', null)),
            'Restore all items',
            items.length ? restoreAll : undefined,
          )}
        {selectedPaths.length > 0 &&
          taskRow(
            getArt('recycle-full16', getArt('recycle-full', null)),
            selectedPaths.length === 1
              ? 'Restore this item'
              : 'Restore the selected items',
            restoreSelected,
          )}
      </>,
    );
  }
  if (p.archive)
    return card(
      'zip-tasks',
      'Folder Tasks',
      taskRow(zipTaskIcon, 'Extract all files', () =>
        p.zipExtraction.extract(p.archive.archive),
      ),
    );
  if (p.shellFolderKind === 'music') {
    return card(
      'music-tasks',
      'Music Tasks',
      <>
        {taskRow(getArt('MyMusic', folderSmall), 'Play all')}
        {taskRow(network, 'Shop for music online')}
      </>,
    );
  }
  if (p.shellFolderKind === 'pictures') {
    // "View as a slide show" hands the first picture to the viewer, which
    // walks the rest of the folder from there
    return card(
      'picture-tasks',
      'Picture Tasks',
      <>
        {taskRow(
          getArt('Slideshow', folderSmall),
          'View as a slide show',
          p.firstPicture
            ? () => p.onShellOpen && p.onShellOpen(p.firstPicture)
            : undefined,
        )}
        {taskRow(network, 'Order prints online')}
        {taskRow(getArt('Printer', folderSmall), 'Print pictures')}
      </>,
    );
  }
  return null;
}

function FileTasks({
  vfs,
  selectedPaths,
  selectedNode,
  modifiableSelection,
  createNew,
  onRename,
  deletePaths,
}) {
  if (selectedPaths.length === 0) {
    return (
      <>
        {taskRow(newFolderIcon, 'Make a new folder', () => createNew('folder'))}
        {taskRow(publishIcon, 'Publish this folder to the Web')}
        {taskRow(shareIcon, 'Share this folder')}
      </>
    );
  }
  const multi = selectedPaths.length > 1;
  const noun = multi
    ? 'the selected items'
    : selectedNode && selectedNode.type === 'folder'
    ? 'this folder'
    : 'this file';
  return (
    <>
      {!multi &&
        selectedNode &&
        !selectedNode.system &&
        selectedNode.type !== 'drive' &&
        taskRow(folderSmall, `Rename ${noun}`, () =>
          onRename(selectedNode.path),
        )}
      {taskRow(documentIcon, `Move ${noun}`)}
      {taskRow(documentIcon, `Copy ${noun}`, () =>
        vfs.clipboardCopy(selectedPaths),
      )}
      {taskRow(
        network,
        multi
          ? 'Publish the selected items to the Web'
          : `Publish ${noun} to the Web`,
      )}
      {!multi &&
        selectedNode &&
        selectedNode.type === 'file' &&
        taskRow(network, 'E-mail this file')}
      {modifiableSelection.length > 0 &&
        taskRow(remove, `Delete ${noun}`, () => deletePaths(selectedPaths))}
    </>
  );
}

function OtherPlaces({
  vfs,
  inFolder,
  inRecycleBin,
  currentPath,
  shellFolderKind,
  navigateTo,
}) {
  const shared = SPECIAL_FOLDERS.SHARED_DOCUMENTS;
  if (inRecycleBin) {
    return (
      <>
        {taskRow(desktopTaskIcon, 'Desktop', () =>
          navigateTo(SPECIAL_FOLDERS.DESKTOP),
        )}
        {taskRow(myDocsIcon, 'My Documents', () =>
          navigateTo(SPECIAL_FOLDERS.MY_DOCUMENTS),
        )}
        {taskRow(computerTaskIcon, 'My Computer', () =>
          navigateTo(MY_COMPUTER),
        )}
        {taskRow(networkPlacesIcon, 'My Network Places')}
      </>
    );
  }
  if (!inFolder) {
    return (
      <>
        {taskRow(networkPlacesIcon, 'My Network Places')}
        {taskRow(myDocsIcon, 'My Documents', () =>
          navigateTo(SPECIAL_FOLDERS.MY_DOCUMENTS),
        )}
        {vfs.exists(shared) &&
          taskRow(sharedDocsIcon, 'Shared Documents', () => navigateTo(shared))}
        {taskRow(controlPanelIcon, CONTROL_PANEL, () =>
          navigateTo(CONTROL_PANEL),
        )}
      </>
    );
  }
  const myDocs = SPECIAL_FOLDERS.MY_DOCUMENTS;
  // My Documents' shell parent is the Desktop, not the profile folder; the
  // profile folder is never a place XP offers
  const parentPath =
    normalizePath(currentPath) === normalizePath(myDocs)
      ? SPECIAL_FOLDERS.DESKTOP
      : getParentPath(currentPath);
  const parentNode =
    parentPath && parentPath !== currentPath && vfs.exists(parentPath)
      ? vfs.getNode(parentPath)
      : null;
  // My Music/Pictures/Videos point at their shared counterpart instead of
  // the generic Shared Documents
  const sharedSpecial = {
    music: [SPECIAL_FOLDERS.SHARED_MUSIC, 'Shared Music'],
    pictures: [SPECIAL_FOLDERS.SHARED_PICTURES, 'Shared Pictures'],
    videos: [SPECIAL_FOLDERS.SHARED_VIDEOS, 'Shared Video'],
  }[shellFolderKind];
  return (
    <>
      {parentNode
        ? taskRow(
            parentNode.icon || folderSmall,
            placeName(vfs, parentNode.path),
            () => navigateTo(parentNode.path),
            'parent',
          )
        : taskRow(
            computerTaskIcon,
            MY_COMPUTER,
            () => navigateTo(MY_COMPUTER),
            'parent',
          )}
      {currentPath !== myDocs &&
        parentPath !== myDocs &&
        taskRow(myDocsIcon, 'My Documents', () => navigateTo(myDocs), 'mydocs')}
      {sharedSpecial && vfs.exists(sharedSpecial[0])
        ? taskRow(
            vfs.getNode(sharedSpecial[0]).icon || documentIcon,
            sharedSpecial[1],
            () => navigateTo(sharedSpecial[0]),
            'shared',
          )
        : vfs.exists(shared) &&
          currentPath !== shared &&
          parentPath !== shared &&
          taskRow(
            sharedDocsIcon,
            'Shared Documents',
            () => navigateTo(shared),
            'shared',
          )}
      {parentNode &&
        taskRow(
          computerTaskIcon,
          MY_COMPUTER,
          () => navigateTo(MY_COMPUTER),
          'mycomputer',
        )}
      {taskRow(networkPlacesIcon, 'My Network Places', undefined, 'network')}
    </>
  );
}

function DetailsPanel({
  inFolder,
  inRecycleBin,
  currentPath,
  currentNode,
  selectedPaths,
  selectedNode,
  selectedSize,
  hideExt,
}) {
  if (inRecycleBin && !selectedNode) {
    return (
      <>
        {text('Recycle Bin', true)}
        {text('System Folder')}
      </>
    );
  }
  if (selectedNode) {
    const n = selectedNode;
    return (
      <>
        {text(displayName(n, hideExt), true)}
        {text(getTypeLabel(n))}
        {n.type === 'drive' &&
          n.freeSpace != null &&
          text(`Free Space: ${formatSize(n.freeSpace)}`)}
        {n.type === 'drive' &&
          n.totalSpace != null &&
          text(`Total Size: ${formatSize(n.totalSpace)}`)}
        {n.type === 'file' && text(`Size: ${formatSize(n.size)}`)}
        {n.modifiedAt &&
          n.type !== 'drive' &&
          n.type !== 'special' &&
          text(`Date Modified: ${new Date(n.modifiedAt).toLocaleDateString()}`)}
      </>
    );
  }
  if (selectedPaths.length > 1) {
    return (
      <>
        {text(`${selectedPaths.length} items selected`, true)}
        {selectedSize > 0 &&
          text(`Total File Size: ${formatSize(selectedSize)}`)}
      </>
    );
  }
  return (
    <>
      {text(!inFolder ? MY_COMPUTER : currentNode?.name || currentPath, true)}
      {text(!inFolder ? 'System Folder' : getTypeLabel(currentNode))}
    </>
  );
}

/**
 * The blue pane left of the file list: the shell folder's own card, then
 * File and Folder Tasks (or System Tasks), Other Places and Details. Which
 * cards show depends on where the window is; what their rows do comes in
 * as callbacks. Collapse state stays with the window, so it survives the
 * Folders pane being toggled.
 */
export default function LeftPane(p) {
  const { collapsed, onToggleCard, inFolder, contentsHidden } = p;
  const card = (key, title, content) => (
    <TaskCard
      key={key}
      title={title}
      collapsed={!!collapsed[key]}
      onToggle={() => onToggleCard(key)}
    >
      {content}
    </TaskCard>
  );

  let tasks = null;
  if (contentsHidden) {
    tasks = card(
      'tasks',
      'System Tasks',
      <>
        {taskRow(
          folderSmall,
          'Show the contents of this folder',
          p.revealContents,
        )}
        {taskRow(addRemoveIcon, 'Add or remove programs')}
        {taskRow(search, 'Search for files or folders')}
      </>,
    );
  } else if (!inFolder) {
    tasks = card(
      'tasks',
      'System Tasks',
      <>
        {taskRow(
          viewInfo,
          'View system information',
          p.onShellOpen ? () => p.onShellOpen(EXE_PATHS.SYSDM_CPL) : undefined,
        )}
        {taskRow(addRemoveIcon, 'Add or remove programs')}
        {taskRow(controlPanelIcon, 'Change a setting', () =>
          p.navigateTo(CONTROL_PANEL),
        )}
      </>,
    );
  } else if (!p.archive && !p.inRecycleBin) {
    // archives only extract; the bin's card carries its verbs
    tasks = card('tasks', 'File and Folder Tasks', <FileTasks {...p} />);
  }

  return (
    <div className="com__content__left">
      {inFolder && !contentsHidden && shellFolderCard(p, card)}
      {tasks}
      {card('places', 'Other Places', <OtherPlaces {...p} />)}
      {card('details', 'Details', <DetailsPanel {...p} />)}
    </div>
  );
}
