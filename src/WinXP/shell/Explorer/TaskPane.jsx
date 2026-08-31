// Luna task pane pieces: the blue left pane's roll-up card chrome and its
// link rows. Which cards show, and what their rows do, stays with Explorer.
import React from 'react';

import { TaskChevron } from './styles';

// Rows need unique keys even when labels repeat ("My Documents" can appear
// as both the parent row and the special-folder row): duplicate keys make
// React's reconciler leave ghost copies behind across navigations.
export const taskRow = (icon, label, onClick, rowKey) => (
  <div className="com__content__left__card__row" key={rowKey || label}>
    <img className="com__content__left__card__img" src={icon} alt="" />
    <div
      className={`com__content__left__card__text link${
        onClick ? '' : ' inert'
      }`}
      onClick={onClick}
    >
      {label}
    </div>
  </div>
);

/** One roll-up card. Collapse state lives with the caller (per window). */
export const TaskCard = ({ title, collapsed, onToggle, children }) => (
  <div className="com__content__left__card">
    <div className="com__content__left__card__header" onClick={onToggle}>
      <div className="com__content__left__card__header__text">{title}</div>
      <TaskChevron collapsed={collapsed} />
    </div>
    {!collapsed && (
      <div className="com__content__left__card__content">{children}</div>
    )}
  </div>
);


