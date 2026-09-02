/*
 * shellOpen — the one launch path for everything the shell opens.
 *
 * Desktop icons, Start Menu entries, file associations, the Run box and
 * cmd's `start` all end here: sentinels and namespaces browse in Explorer,
 * shortcuts chase their targets, executables resolve through the program
 * registry, documents open in whatever owns their extension, and the flow
 * ends in the Open With picker exactly where the real shell's did.
 *
 * It lives beside the namespace resolver rather than inside the shell
 * runtime because "what happens when you open this" is namespace policy;
 * the runtime only supplies the machinery (window launching, dialogs).
 */
import {
  EXE_PATHS,
  SPECIAL_FOLDERS,
  getFileAssociation,
  isExecutablePath,
} from '../../context/vfsConstants';
import { getExtension } from '../../context/vfsUtils';
import {
  RECYCLE_BIN,
  MY_COMPUTER_TARGET,
  RECYCLE_BIN_TARGET,
  isShellObjectTarget,
} from './location';
import { recordProgramLaunch } from '../startMenuConfig';

/**
 * Build the shell's open function from the runtime's machinery:
 * { vfs, dlg, userName, launchProgram, openErrorBox, getProgramByPath,
 *   setOpenWith, reopen } — `reopen` re-enters the CURRENT shellOpen (for
 *   shortcut chains), so the runtime passes its own ref through.
 */
export function createShellOpen({
  vfs,
  dlg,
  userName,
  launchProgram,
  openErrorBox,
  getProgramByPath,
  setOpenWith,
  reopen,
}) {
  return function shellOpen(target, opts = {}) {
    // 1-in-15 egg ambush on program launches, active only before the
    // first egg is EVER collected. lastEggTime survives trading eggs away
    // in the shop, so a balance back at zero doesn't restart the ambush.
    const shouldAmbushWithEgg = () => {
      try {
        const eggs = vfs.getUserConfigFor(userName, 'eggData', null);
        if (Array.isArray(eggs) && eggs.length > 0) return false;
        if (vfs.getUserConfigFor(userName, 'lastEggTime', null) != null)
          return false;
        return Math.random() < 1 / 15;
      } catch {
        return false;
      }
    };
    if (!target) return;
    const depth = opts.depth || 0;
    const injectProps = opts.injectProps || {};
    const toWinPath = p => String(p).replace(/\//g, '\\');
    // Namespaces and folders browse in Explorer rather than launching a
    // program; this was pasted five times before it was one helper.
    const browseIn = initialPath => {
      const explorer = getProgramByPath(EXE_PATHS.EXPLORER);
      if (explorer)
        launchProgram(
          explorer,
          initialPath ? { initialPath, ...injectProps } : injectProps,
        );
    };
    const cannotFind = (what, title) =>
      openErrorBox(
        `Windows cannot find '${what}'. Make sure you typed the name correctly, and then try again. To search for a file, click the Start button, and then click Search.`,
        title,
      );

    if (/^https?:\/\//i.test(target)) {
      const ie = getProgramByPath(EXE_PATHS.IEXPLORE);
      if (ie) launchProgram(ie, { initialUrl: target, ...injectProps });
      return;
    }
    // Shell object tokens (not filesystem paths)
    if (target === MY_COMPUTER_TARGET) {
      browseIn(null);
      return;
    }
    if (target === RECYCLE_BIN_TARGET) {
      // A namespace of Explorer, as it really was — not a program
      browseIn(RECYCLE_BIN);
      return;
    }

    const node = vfs.getNode(target);
    if (!node) {
      cannotFind(
        toWinPath(target),
        String(target)
          .split('/')
          .pop(),
      );
      return;
    }

    if (node.type === 'shortcut') {
      if (depth > 4) return;
      const t = node.target;
      if (isShellObjectTarget(t)) {
        reopen(t, { depth: depth + 1 });
        return;
      }
      const targetNode = t ? vfs.getNode(t) : null;
      if (!targetNode) {
        dlg
          .confirm(
            `The item '${
              t
                ? String(t)
                    .split('/')
                    .pop()
                : node.name
            }' that this shortcut refers to has been changed or moved, so this shortcut will no longer work properly.\n\nDo you want to delete this shortcut?`,
            'Problem with Shortcut',
          )
          .then(yes => {
            if (yes) vfs.deleteNodePermanently(node.path);
          });
        return;
      }
      reopen(targetNode.path, {
        depth: depth + 1,
        injectProps: { ...(node.targetArgs || {}), ...injectProps },
      });
      return;
    }

    if (node.type === 'special') {
      if (node.specialFolder === 'recycle-bin') {
        reopen(RECYCLE_BIN_TARGET, { depth: depth + 1 });
      } else {
        browseIn(null);
      }
      return;
    }

    if (node.type === 'folder' || node.type === 'drive') {
      if (node.path === SPECIAL_FOLDERS.RECYCLER) {
        reopen(RECYCLE_BIN_TARGET, { depth: depth + 1 });
        return;
      }
      browseIn(node.path);
      return;
    }

    // The program the user picked with "Always use this program", if any
    const overrideFor = extension => {
      try {
        const map =
          vfs.getUserConfigFor(userName, 'fileAssocOverrides', null) || {};
        return map[extension] || null;
      } catch {
        return null;
      }
    };

    // A .zip is a folder as far as the shell is concerned: Compressed
    // Folders was a namespace extension, so opening one browses it in
    // Explorer. Unless the user has pointed .zip at a program of their own,
    // in which case that choice has to mean something.
    const zipOverride = overrideFor('.zip');
    const zipIsDefault =
      !zipOverride ||
      zipOverride.toLowerCase() === EXE_PATHS.ZIPFLDR.toLowerCase();
    // An explicit "Open With..." must reach the picker even for a zip —
    // it is the way an overridden association gets pointed back here.
    if (/\.zip$/i.test(node.name) && zipIsDefault && !opts.openWith) {
      browseIn(node.path);
      return;
    }

    // Executables resolve through the program registry
    if (isExecutablePath(node.path)) {
      const program = getProgramByPath(node.path);
      // Some registered "programs" are Explorer namespaces (control.exe is
      // the Control Panel): browse them instead of opening a window
      if (program && program.namespace) {
        browseIn(program.namespace);
        return;
      }
      // Until the first egg is found, launching any program has a small
      // chance of summoning the egg instead. Once collected, the '???'
      // shortcut lives openly on the desktop and the ambush stops. The
      // secrets themselves are never ambushed.
      const secret = program && program.excludeFromMfu && program.unlisted;
      if (!secret && shouldAmbushWithEgg()) {
        const eggProgram = getProgramByPath(EXE_PATHS.MISSINGNO);
        if (eggProgram) {
          launchProgram(eggProgram, injectProps);
          return;
        }
      }
      if (program) {
        // The most-used list counts launches, except of the programs it
        // never shows
        // Counted under the registered path, so a mirror copy and the
        // original are one program to the Start menu
        if (!program.excludeFromMfu)
          recordProgramLaunch(vfs, userName, program.exePath || node.path);
        launchProgram(program, injectProps, {
          size: opts.size,
          offset: opts.offset,
        });
      } else {
        openErrorBox(
          `${node.name} is not a valid Win32 application.`,
          toWinPath(node.path),
        );
      }
      return;
    }

    // Explicit "Open With..." request from a context menu
    if (opts.openWith) {
      setOpenWith({ path: node.path, unknown: false });
      return;
    }

    // "Open With > <program>" — a one-off launch with this file; it does
    // not touch the stored association
    if (opts.withExe) {
      const chosen = getProgramByPath(opts.withExe);
      if (chosen) launchProgram(chosen, { filePath: node.path });
      return;
    }

    // Per-user "Always use this program" overrides beat the static map
    const ext = getExtension(node.path);
    if (ext) {
      const overrideExe = overrideFor(ext);
      const overrideProgram = overrideExe
        ? getProgramByPath(overrideExe)
        : null;
      if (overrideProgram) {
        launchProgram(overrideProgram, {
          filePath: node.path,
          ...injectProps,
        });
        vfs.addRecentDocument(node.path);
        return;
      }
    }

    // Documents open with their associated program
    const assoc = getFileAssociation(node.path);
    if (assoc) {
      const exeNode = vfs.getNode(assoc.exePath);
      const program = exeNode ? getProgramByPath(exeNode.path) : null;
      if (!program) {
        cannotFind(toWinPath(assoc.exePath), node.name);
        return;
      }
      launchProgram(program, { filePath: node.path, ...injectProps });
      vfs.addRecentDocument(node.path);
      return;
    }

    // Unknown type — the real XP flow ends in the Open With picker
    setOpenWith({ path: node.path, unknown: true });
  };
}
