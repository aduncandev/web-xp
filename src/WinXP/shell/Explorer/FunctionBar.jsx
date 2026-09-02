import React from 'react';

import search from 'assets/windowsIcons/299(32x32).png';
import back from 'assets/windowsIcons/back.png';
import forward from 'assets/windowsIcons/forward.png';
import up from 'assets/windowsIcons/up.png';
import menu from 'assets/windowsIcons/358(32x32).png';
import folderOpen from 'assets/windowsIcons/337(32x32).png';

/** The Standard Buttons row: Back, Forward, Up, Search, Folders, Views. */
export default function FunctionBar({
  canBack,
  canForward,
  canUp,
  onBack,
  onForward,
  onUp,
  onHistoryMenu,
  foldersOpen,
  onToggleFolders,
  viewsLocked,
  onViews,
}) {
  return (
    <section className="com__function_bar">
      <div
        className={`com__function_bar__button${canBack ? '' : '--disable'}`}
        onClick={onBack}
      >
        <img className="com__function_bar__icon" src={back} alt="Back" />
        <span className="com__function_bar__text">Back</span>
        <div
          className="com__function_bar__arrow"
          onClick={e => canBack && onHistoryMenu(e, 'back')}
        />
      </div>

      <div
        className={`com__function_bar__button${canForward ? '' : '--disable'}`}
        onClick={onForward}
      >
        <img
          className="com__function_bar__icon"
          src={forward}
          alt="Forward"
        />
        <div
          className="com__function_bar__arrow"
          onClick={e => canForward && onHistoryMenu(e, 'forward')}
        />
      </div>

      <div
        className={`com__function_bar__button${canUp ? '' : '--disable'}`}
        onClick={onUp}
      >
        <img
          className="com__function_bar__icon--normalize"
          src={up}
          alt="Up"
        />
      </div>

      <div className="com__function_bar__separate" />

      <div className="com__function_bar__button">
        <img
          className="com__function_bar__icon--normalize "
          src={search}
          alt="Search"
        />
        <span className="com__function_bar__text">Search</span>
      </div>
      <div
        className={`com__function_bar__button${
          foldersOpen ? ' com__function_bar__button--active' : ''
        }`}
        onClick={onToggleFolders}
      >
        <img
          className="com__function_bar__icon--normalize"
          src={folderOpen}
          alt="Folders"
        />
        <span className="com__function_bar__text">Folders</span>
      </div>
      <div className="com__function_bar__separate" />
      <div
        className={`com__function_bar__button${viewsLocked ? '--disable' : ''}`}
        onClick={viewsLocked ? undefined : onViews}
      >
        <img
          className="com__function_bar__icon--margin12"
          src={menu}
          alt="Views"
        />
        <div className="com__function_bar__arrow" />
      </div>
    </section>
  );
}
