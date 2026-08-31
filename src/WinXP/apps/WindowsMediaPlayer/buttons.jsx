import { useState } from 'react';

import { M } from './chrome';

import groupUp from './skin/btngroup_up.png';
import groupHover from './skin/btngroup_hover.png';
import groupDown from './skin/btngroup_down.png';

/** One half of the prev/next button group, clipped out of the shared sheet. */
export default function GroupHalf({ style, $offset, onClick, ...rest }) {
  const [state, setState] = useState('up');
  const image =
    state === 'down' ? groupDown : state === 'hover' ? groupHover : groupUp;
  return (
    <button
      {...rest}
      type="button"
      onClick={onClick}
      onMouseEnter={() => setState('hover')}
      onMouseLeave={() => setState('up')}
      onMouseDown={() => setState('down')}
      onMouseUp={() => setState('hover')}
      style={{
        position: 'absolute',
        height: M.prevNext.h,
        padding: 0,
        border: 0,
        cursor: 'pointer',
        backgroundColor: 'transparent',
        backgroundImage: `url(${image})`,
        backgroundPosition: `${$offset}px 0`,
        backgroundRepeat: 'no-repeat',
        ...style,
      }}
    />
  );
}

