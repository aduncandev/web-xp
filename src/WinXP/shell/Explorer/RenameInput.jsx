import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Inline rename editor. Like the shell's own edit box it always shows the
 * whole name: the icon-ish views wrap it downward, the row views widen it to
 * the right. It floats over the item so growing never shifts the layout.
 */
export default function RenameInput({
  defaultValue,
  selectBase,
  onFinish,
  multiline,
}) {
  const [value, setValue] = useState(defaultValue);
  const ref = useRef(null);
  const sizerRef = useRef(null);
  const [width, setWidth] = useState(null);

  // Grow to fit whatever is typed
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (multiline) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    } else if (sizerRef.current) {
      setWidth(Math.min(Math.max(sizerRef.current.offsetWidth + 12, 60), 460));
    }
  }, [value, multiline]);

  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
      // With a visible extension, select only the base name (like XP)
      const dot = selectBase ? defaultValue.lastIndexOf('.') : -1;
      if (dot > 0) {
        ref.current.setSelectionRange(0, dot);
      } else {
        ref.current.select();
      }
    }
  }, [defaultValue, selectBase]);

  const common = {
    ref,
    className: `com__rename-input${
      multiline ? ' com__rename-input--wrap' : ''
    }`,
    value,
    onChange: e => setValue(e.target.value),
    onKeyDown: e => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault(); // never insert a newline into a file name
        onFinish(value.trim());
      }
      if (e.key === 'Escape') onFinish(defaultValue); // cancel
    },
    onBlur: () => onFinish(value.trim()),
    onClick: e => e.stopPropagation(),
    // The row is draggable="false" while renaming, so the pointer is free to
    // sweep a text selection, just keep the events off the list handlers
    onMouseDown: e => e.stopPropagation(),
    onDoubleClick: e => e.stopPropagation(),
    spellCheck: false,
  };

  return (
    <span className="com__rename-wrap">
      {!multiline && (
        <span ref={sizerRef} className="com__rename-sizer" aria-hidden="true">
          {value || ' '}
        </span>
      )}
      {multiline ? (
        <textarea {...common} rows={1} />
      ) : (
        <input
          {...common}
          style={width ? { width: `${width}px` } : undefined}
        />
      )}
    </span>
  );
}
