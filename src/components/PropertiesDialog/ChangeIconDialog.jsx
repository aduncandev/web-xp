import React, { useMemo, useState } from 'react';

import XPDialogFrame from 'components/XPDialogFrame';
import XPButton from 'components/XPButton';
import { PROGRAMS } from '../../WinXP/apps';
import { IconBody } from './styles';

/** XP's Change Icon picker, stocked with the icons this build actually has. */
export default function ChangeIconDialog({ current, onPick, onClose }) {
  const [selected, setSelected] = useState(current || null);

  const icons = useMemo(() => {
    const seen = new Set();
    const out = [];
    // Every registered program's own icon, plus the shell's file-type icons
    const push = (icon, iconLarge) => {
      if (!icon || seen.has(icon)) return;
      seen.add(icon);
      out.push({ icon, iconLarge: iconLarge || icon });
    };
    Object.values(PROGRAMS).forEach(p => {
      if (p && !p.unlisted && p.header && p.header.icon)
        push(p.header.icon, p.header.icon);
    });
    return out;
  }, []);

  return (
    <XPDialogFrame
      title="Change Icon"
      width={400}
      onClose={onClose}
      zIndex={99990}
    >
      <IconBody>
        <div className="ci-label">Select an icon from the list below:</div>
        <div className="ci-grid">
          {icons.map(i => (
            <div
              key={i.icon}
              className={`ci-cell${selected === i.icon ? ' selected' : ''}`}
              onClick={() => setSelected(i.icon)}
              onDoubleClick={() => onPick(i.icon, i.iconLarge)}
            >
              <img src={i.icon} alt="" />
            </div>
          ))}
        </div>
        <div className="ci-footer">
          <XPButton
            disabled={!selected}
            onClick={() => {
              const hit = icons.find(i => i.icon === selected);
              if (hit) onPick(hit.icon, hit.iconLarge);
            }}
          >
            OK
          </XPButton>
          <XPButton onClick={onClose}>Cancel</XPButton>
        </div>
      </IconBody>
    </XPDialogFrame>
  );
}
