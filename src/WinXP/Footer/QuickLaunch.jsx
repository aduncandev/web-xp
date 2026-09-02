import React, { useState } from 'react';
import XPTooltip from 'components/XPTooltip';
import ContextMenu from 'components/ContextMenu';
import OpenWithDialog from '../../components/OpenWithDialog';
import { getArt } from '../../xpArt';
import { ARRANGE, requestArrange } from '../shellBus';
import { setStartMenuConfig, QUICK_LAUNCH_SHOW_DESKTOP } from '../startMenuConfig';
import { PROGRAMS } from '../apps';
import { programIcon16 } from '../apps/programMeta';
import genericAppIcon from 'assets/windowsIcons/shell32-2(16x16).png';

const SHOW_DESKTOP = {
  exePath: QUICK_LAUNCH_SHOW_DESKTOP,
  name: 'Show Desktop',
  icon: getArt('ShowDesktop', null),
};

function entryFor(slot) {
  if (slot === QUICK_LAUNCH_SHOW_DESKTOP)
    return { icon: SHOW_DESKTOP.icon, label: SHOW_DESKTOP.name };
  const program = PROGRAMS[slot];
  return {
    // A slot holding something that is not a program still renders, with
    // the generic-application icon, so it can be right-clicked and
    // reassigned instead of silently vanishing from the bar
    icon:
      programIcon16(slot) || (program && program.header.icon) || genericAppIcon,
    label: program
      ? program.displayName
      : String(slot)
          .split('/')
          .pop(),
  };
}

/**
 * The Quick Launch strip: Show Desktop, IE and WMP by default. Any slot can
 * be reassigned from its right-click menu, a deliberate departure from
 * stock XP. The slots live in the user's Start menu config.
 */
export default function QuickLaunch({ vfs, userName, taskbar, onLaunch }) {
  const [menu, setMenu] = useState(null); // { x, y, slot }
  const [picker, setPicker] = useState(null); // slot index
  const slots = taskbar.quickLaunch || [];

  const launch = slot => {
    if (slot === QUICK_LAUNCH_SHOW_DESKTOP) requestArrange(ARRANGE.SHOW_DESKTOP);
    else onLaunch(slot);
  };
  const assign = (index, exePath) => {
    const next = [...slots];
    next[index] = exePath;
    setStartMenuConfig(vfs, userName, {
      taskbar: { ...taskbar, quickLaunch: next },
    });
  };

  return (
    <div
      className="footer__quicklaunch"
      // the strip's own right-click is not the taskbar's
      onContextMenu={e => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {slots.map((slot, i) => {
        const entry = entryFor(slot);
        if (!entry.icon) return null;
        return (
          <XPTooltip key={`${slot}-${i}`} text={entry.label}>
            <img
              className="footer__ql"
              src={entry.icon}
              alt={entry.label}
              draggable={false}
              onMouseDown={e => e.stopPropagation()}
              onClick={() => launch(slot)}
              onContextMenu={e => {
                e.preventDefault();
                e.stopPropagation();
                setMenu({ x: e.clientX, y: e.clientY, slot: i });
              }}
            />
          </XPTooltip>
        );
      })}
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={[
            { label: 'Open', action: 'open', bold: true },
            { type: 'separator' },
            { label: 'Choose Program...', action: 'choose' },
          ]}
          onAction={action => {
            if (action === 'open') launch(slots[menu.slot]);
            else if (action === 'choose') setPicker(menu.slot);
          }}
          onClose={() => setMenu(null)}
        />
      )}
      {picker != null && (
        <OpenWithDialog
          mode="choose"
          programsOnly
          title="Choose Program"
          headerText="Choose the program for this Quick Launch button:"
          extraPrograms={[SHOW_DESKTOP]}
          onClose={() => setPicker(null)}
          onLaunch={exePath => {
            assign(picker, exePath);
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}
