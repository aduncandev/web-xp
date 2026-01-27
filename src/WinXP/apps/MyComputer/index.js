import React, { useState } from 'react';
import styled from 'styled-components';

import { WindowDropDowns } from 'components';
import dropDownData from './dropDownData';

// Icons
import go from 'assets/windowsIcons/290.png';
import search from 'assets/windowsIcons/299(32x32).png';
import computer from 'assets/windowsIcons/676(16x16).png';
import back from 'assets/windowsIcons/back.png';
import forward from 'assets/windowsIcons/forward.png';
import up from 'assets/windowsIcons/up.png';
import viewInfo from 'assets/windowsIcons/view-info.ico';
import remove from 'assets/windowsIcons/302(16x16).png';
import control from 'assets/windowsIcons/300(16x16).png';
import network from 'assets/windowsIcons/693(16x16).png';
import documentIcon from 'assets/windowsIcons/308(16x16).png';
import folderSmall from 'assets/windowsIcons/318(16x16).png';
import menu from 'assets/windowsIcons/358(32x32).png';
import folder from 'assets/windowsIcons/318(48x48).png';
import folderOpen from 'assets/windowsIcons/337(32x32).png';
import disk from 'assets/windowsIcons/334(48x48).png';
import cd from 'assets/windowsIcons/111(48x48).png';
import dropdown from 'assets/windowsIcons/dropdown.png';
import pullup from 'assets/windowsIcons/pullup.png';
import windows from 'assets/windowsIcons/windows.png';

export default function MyComputer({ onClose }) {
  // --- STATE ---
  const [history, setHistory] = useState(['My Computer']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);

  const currentPath = history[historyIndex];

  // --- MOCK FILE SYSTEM DATA ---
  const fileSystem = {
    'My Computer': {
      label: 'My Computer',
      icon: computer,
      items: [
        // Group: Files Stored on This Computer
        {
          name: 'Shared Documents',
          type: 'File Folder',
          icon: folder,
          group: 'Files Stored on This Computer',
          path: 'Shared Documents',
        },
        {
          name: "User's Documents",
          type: 'File Folder',
          icon: folder,
          group: 'Files Stored on This Computer',
          path: "User's Documents",
        },
        // Group: Hard Disk Drives
        {
          name: 'Local Disk (C:)',
          type: 'Local Disk',
          icon: disk,
          group: 'Hard Disk Drives',
          path: 'C:',
          freeSpace: '32 GB',
          totalSize: '40 GB',
        },
        // Group: Devices with Removable Storage
        {
          name: 'CD Drive (D:)',
          type: 'CD Drive',
          icon: cd,
          group: 'Devices with Removable Storage',
          path: 'D:',
          totalSize: '650 MB',
        },
      ],
    },
    'Shared Documents': {
      label: 'Shared Documents',
      type: 'File Folder',
      items: [
        { name: 'My Music', type: 'Folder', icon: folder },
        { name: 'My Pictures', type: 'Folder', icon: folder },
        { name: 'My Videos', type: 'Folder', icon: folder },
      ],
    },
    "User's Documents": {
      label: "User's Documents",
      type: 'File Folder',
      items: [
        { name: 'Resume.txt', type: 'Text Document', icon: documentIcon },
        { name: 'Notes', type: 'Folder', icon: folder },
      ],
    },
    'C:': {
      label: 'Local Disk (C:)',
      type: 'Local Disk',
      items: [
        { name: 'WINDOWS', type: 'Folder', icon: folder },
        { name: 'Program Files', type: 'Folder', icon: folder },
        { name: 'Documents and Settings', type: 'Folder', icon: folder },
      ],
    },
    'D:': {
      label: 'CD Drive (D:)',
      type: 'CD Drive',
      items: [],
    },
  };

  // --- NAVIGATION LOGIC ---
  const navigateTo = path => {
    if (!fileSystem[path]) return; // Prevent navigation if folder doesn't exist in mock data
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(path);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setSelectedItem(null); // Deselect on nav
  };

  const goBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setSelectedItem(null);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setSelectedItem(null);
    }
  };

  const goUp = () => {
    // Simple logic: if not at root, go to 'My Computer'
    // A real file system would parse paths (e.g. C:/Windows -> C:)
    if (currentPath !== 'My Computer') {
      navigateTo('My Computer');
    }
  };

  function onClickOptionItem(item) {
    switch (item) {
      case 'Close':
        onClose();
        break;
      case 'Up One Level':
        goUp();
        break;
      case 'Back':
        goBack();
        break;
      case 'Forward':
        goForward();
        break;
      default:
        break;
    }
  }

  // --- HELPER RENDERS ---
  const renderDetailsPanel = () => {
    if (selectedItem) {
      return (
        <div className="com__content__left__card__content">
          {/* Shows icon if available, or generic info */}
          <div className="com__content__left__card__text bold">
            {selectedItem.name}
          </div>
          <div className="com__content__left__card__text">
            {selectedItem.type}
          </div>
          {selectedItem.freeSpace && (
            <div className="com__content__left__card__text">
              Free Space: {selectedItem.freeSpace}
            </div>
          )}
          {selectedItem.totalSize && (
            <div className="com__content__left__card__text">
              Total Size: {selectedItem.totalSize}
            </div>
          )}
        </div>
      );
    }
    // Default view when nothing selected depends on current folder
    const folderInfo = fileSystem[currentPath];
    return (
      <div className="com__content__left__card__content">
        <div className="com__content__left__card__text bold">
          {folderInfo.label}
        </div>
        <div className="com__content__left__card__text">
          {folderInfo.type || 'System Folder'}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    const currentData = fileSystem[currentPath];
    if (!currentData) return <div>Folder not found</div>;

    // Special Layout for "My Computer" (Grouped)
    if (currentPath === 'My Computer') {
      const groups = [
        'Files Stored on This Computer',
        'Hard Disk Drives',
        'Devices with Removable Storage',
        'Other',
      ];
      return groups.map(group => {
        const groupItems = currentData.items.filter(i => i.group === group);
        if (groupItems.length === 0 && group !== 'Other') return null;

        return (
          <div key={group} className="com__content__right__card">
            <div className="com__content__right__card__header">{group}</div>
            <div className="com__content__right__card__content">
              {groupItems.map(item => (
                <div
                  key={item.name}
                  className={`com__content__right__card__item ${
                    selectedItem?.name === item.name ? 'selected' : ''
                  }`}
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedItem(item);
                  }}
                  onDoubleClick={() => item.path && navigateTo(item.path)}
                >
                  <img
                    src={item.icon}
                    alt={item.name}
                    className="com__content__right__card__img"
                  />
                  <div className="com__content__right__card__img-container">
                    <div className="com__content__right__card__text">
                      {item.name}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      });
    }

    // Generic Layout for other folders (Flat list)
    return (
      <div className="com__content__right__card">
        <div className="com__content__right__card__content">
          {currentData.items.map(item => (
            <div
              key={item.name}
              className={`com__content__right__card__item ${
                selectedItem?.name === item.name ? 'selected' : ''
              }`}
              onClick={e => {
                e.stopPropagation();
                setSelectedItem(item);
              }}
              onDoubleClick={() => item.path && navigateTo(item.path)}
            >
              <img
                src={item.icon}
                alt={item.name}
                className="com__content__right__card__img"
              />
              <div className="com__content__right__card__img-container">
                <div className="com__content__right__card__text">
                  {item.name}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Div onClick={() => setSelectedItem(null)}>
      <section className="com__toolbar">
        <div className="com__options">
          <WindowDropDowns
            items={dropDownData}
            onClickItem={onClickOptionItem}
          />
        </div>
        <img className="com__windows-logo" src={windows} alt="windows" />
      </section>

      <section className="com__function_bar">
        {/* Back Button */}
        <div
          className={`com__function_bar__button${
            historyIndex > 0 ? '' : '--disable'
          }`}
          onClick={goBack}
        >
          <img className="com__function_bar__icon" src={back} alt="Back" />
          <span className="com__function_bar__text">Back</span>
          <div className="com__function_bar__arrow" />
        </div>

        {/* Forward Button */}
        <div
          className={`com__function_bar__button${
            historyIndex < history.length - 1 ? '' : '--disable'
          }`}
          onClick={goForward}
        >
          <img
            className="com__function_bar__icon"
            src={forward}
            alt="Forward"
          />
          <div className="com__function_bar__arrow" />
        </div>

        {/* Up Button */}
        <div className="com__function_bar__button" onClick={goUp}>
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
        <div className="com__function_bar__button">
          <img
            className="com__function_bar__icon--normalize"
            src={folderOpen}
            alt="Folders"
          />
          <span className="com__function_bar__text">Folders</span>
        </div>
        <div className="com__function_bar__separate" />
        <div className="com__function_bar__button">
          <img
            className="com__function_bar__icon--margin12"
            src={menu}
            alt="Menu"
          />
          <div className="com__function_bar__arrow" />
        </div>
      </section>

      <section className="com__address_bar">
        <div className="com__address_bar__title">Address</div>
        <div className="com__address_bar__content">
          <img
            src={computer}
            alt="icon"
            className="com__address_bar__content__img"
          />
          <div className="com__address_bar__content__text">{currentPath}</div>
          <img
            src={dropdown}
            alt="dropdown"
            className="com__address_bar__content__img"
          />
        </div>
        <div
          className="com__address_bar__go"
          onClick={() => navigateTo(currentPath)}
        >
          <img className="com__address_bar__go__img" src={go} alt="Go" />
          <span className="com__address_bar__go__text">Go</span>
        </div>
      </section>

      <div className="com__content">
        <div className="com__content__inner">
          <div className="com__content__left">
            <div className="com__content__left__card">
              <div className="com__content__left__card__header">
                <div className="com__content__left__card__header__text">
                  System Tasks
                </div>
                <img
                  src={pullup}
                  alt=""
                  className="com__content__left__card__header__img"
                />
              </div>
              <div className="com__content__left__card__content">
                <div className="com__content__left__card__row">
                  <img
                    className="com__content__left__card__img"
                    src={viewInfo}
                    alt="View info"
                  />
                  <div className="com__content__left__card__text link">
                    View system information
                  </div>
                </div>
                <div className="com__content__left__card__row">
                  <img
                    className="com__content__left__card__img"
                    src={remove}
                    alt="Remove programs"
                  />
                  <div className="com__content__left__card__text link">
                    Add or remove programs
                  </div>
                </div>
                <div className="com__content__left__card__row">
                  <img
                    className="com__content__left__card__img"
                    src={control}
                    alt="Change setting"
                  />
                  <div className="com__content__left__card__text link">
                    Change a setting
                  </div>
                </div>
              </div>
            </div>

            <div className="com__content__left__card">
              <div className="com__content__left__card__header">
                <div className="com__content__left__card__header__text">
                  Other Places
                </div>
                <img
                  src={pullup}
                  alt=""
                  className="com__content__left__card__header__img"
                />
              </div>
              <div className="com__content__left__card__content">
                <div className="com__content__left__card__row">
                  <img
                    className="com__content__left__card__img"
                    src={network}
                    alt="Network"
                  />
                  <div className="com__content__left__card__text link">
                    My Network Places
                  </div>
                </div>
                <div className="com__content__left__card__row">
                  <img
                    className="com__content__left__card__img"
                    src={documentIcon}
                    alt="Docs"
                  />
                  <div
                    className="com__content__left__card__text link"
                    onClick={() => navigateTo("User's Documents")}
                  >
                    My Documents
                  </div>
                </div>
                <div className="com__content__left__card__row">
                  <img
                    className="com__content__left__card__img"
                    src={control}
                    alt="Control"
                  />
                  <div className="com__content__left__card__text link">
                    Control Panel
                  </div>
                </div>
              </div>
            </div>

            <div className="com__content__left__card">
              <div className="com__content__left__card__header">
                <div className="com__content__left__card__header__text">
                  Details
                </div>
                <img
                  src={pullup}
                  alt=""
                  className="com__content__left__card__header__img"
                />
              </div>
              {renderDetailsPanel()}
            </div>
          </div>

          <div className="com__content__right">{renderContent()}</div>
        </div>
      </div>
    </Div>
  );
}

// --- STYLES ---
const Div = styled.div`
  height: 100%;
  width: 100%;
  position: absolute;
  display: flex;
  overflow: hidden;
  flex-direction: column;
  background: linear-gradient(to right, #edede5 0%, #ede8cd 100%);

  /* ... [Previous Styled Components for toolbar, function_bar, address_bar remain same] ... */

  /* ADDED: Styles for interactive items */
  .com__content__right__card__item {
    display: flex;
    align-items: center;
    width: 200px;
    margin-bottom: 15px;
    height: auto;
    margin-right: 10px;
    border: 1px solid transparent; /* Prepare for hover border */
    padding: 2px;
  }

  .com__content__right__card__item:hover {
    background-color: rgba(49, 106, 197, 0.1);
    border: 1px solid rgba(49, 106, 197, 0.6);
    cursor: default;
  }

  .com__content__right__card__item.selected {
    background-color: #316ac5;
    border: 1px solid #316ac5;
  }

  .com__content__right__card__item.selected .com__content__right__card__text {
    color: white;
  }

  /* ... [Rest of your previous styles] ... */

  .com__toolbar {
    position: relative;
    display: flex;
    align-items: center;
    line-height: 100%;
    height: 24px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.7);
    flex-shrink: 0;
  }
  .com__options {
    height: 23px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    border-right: 1px solid rgba(0, 0, 0, 0.1);
    padding: 1px 0 1px 2px;
    border-left: 0;
    flex: 1;
  }
  .com__windows-logo {
    height: 100%;
    border-left: 1px solid white;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  }
  .com__function_bar {
    height: 36px;
    display: flex;
    align-items: center;
    font-size: 11px;
    padding: 1px 3px 0;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    flex-shrink: 0;
  }
  .com__function_bar__button {
    display: flex;
    height: 100%;
    align-items: center;
    border: 1px solid rgba(0, 0, 0, 0);
    border-radius: 3px;
    &:hover {
      border: 1px solid rgba(0, 0, 0, 0.1);
      box-shadow: inset 0 -1px 1px rgba(0, 0, 0, 0.1);
    }
    &:hover:active {
      border: 1px solid rgb(185, 185, 185);
      background-color: #dedede;
      box-shadow: inset 0 -1px 1px rgba(255, 255, 255, 0.7);
      color: rgba(255, 255, 255, 0.7);
      & > * {
        transform: translate(1px, 1px);
      }
    }
  }
  .com__function_bar__button--disable {
    filter: grayscale(1);
    opacity: 0.7;
    display: flex;
    height: 100%;
    align-items: center;
    border: 1px solid rgba(0, 0, 0, 0);
  }
  .com__function_bar__text {
    margin-right: 4px;
  }
  .com__function_bar__icon {
    height: 30px;
    width: 30px;
    &--normalize {
      height: 22px;
      width: 22px;
      margin: 0 4px 0 1px;
    }
    &--margin12 {
      height: 22px;
      width: 22px;
      margin: 0 1px 0 2px;
    }
    &--margin-1 {
      margin: 0 -1px;
      height: 30px;
      width: 30px;
    }
  }
  .com__function_bar__separate {
    height: 90%;
    width: 1px;
    background-color: rgba(0, 0, 0, 0.2);
    margin: 0 2px;
  }
  .com__function_bar__arrow {
    height: 100%;
    display: flex;
    align-items: center;
    margin: 0 4px;
    &:before {
      content: '';
      display: block;
      border-width: 3px 3px 0;
      border-color: #000 transparent;
      border-style: solid;
    }
  }
  .com__address_bar {
    flex-shrink: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.7);
    height: 20px;
    font-size: 11px;
    display: flex;
    align-items: center;
    padding: 0 2px;
    box-shadow: inset 0 -2px 3px -1px #b0b0b0;
  }
  .com__address_bar__title {
    line-height: 100%;
    color: rgba(0, 0, 0, 0.5);
    padding: 5px;
  }
  .com__address_bar__content {
    border: rgba(122, 122, 255, 0.6) 1px solid;
    height: 100%;
    display: flex;
    flex: 1;
    align-items: center;
    background-color: white;
    position: relative;
    &__img {
      width: 14px;
      height: 14px;
    }
    &__img:last-child {
      width: 15px;
      height: 15px;
      right: 1px;
      position: absolute;
    }
    &__img:last-child:hover {
      filter: brightness(1.1);
    }
    &__text {
      white-space: nowrap;
      position: absolute;
      left: 16px;
      right: 17px;
    }
  }

  .com__address_bar__go {
    display: flex;
    align-items: center;
    padding: 0 18px 0 5px;
    height: 100%;
    position: relative;
    cursor: pointer;
    &__img {
      height: 95%;
      border: 1px solid rgba(255, 255, 255, 0.2);
      margin-right: 3px;
    }
  }
  .com__content {
    flex: 1;
    border: 1px solid rgba(0, 0, 0, 0.4);
    border-top-width: 0;
    background-color: #f1f1f1;
    overflow: auto;
    font-size: 11px;
    position: relative;
  }
  .com__content__inner {
    display: flex;
    height: 100%;
    overflow: auto;
  }
  .com__content__left {
    width: 180px;
    background: linear-gradient(to bottom, #748aff 0%, #4057d3 100%);
    overflow-y: auto;
    padding: 10px;
    flex-shrink: 0;
  }

  .com__content__left__card {
    border-top-left-radius: 3px;
    border-top-right-radius: 3px;
    width: 100%;
    overflow: hidden;
  }
  .com__content__left__card:not(:last-child) {
    margin-bottom: 12px;
  }
  .com__content__left__card__header {
    display: flex;
    align-items: center;
    height: 23px;
    padding-left: 11px;
    padding-right: 2px;
    cursor: pointer;
    background: linear-gradient(
      to right,
      rgb(240, 240, 255) 0,
      rgb(240, 240, 255) 30%,
      rgb(168, 188, 255) 100%
    );
  }
  .com__content__left__card__header:hover {
    & .com__content__left__card__header__text {
      color: #1c68ff;
    }
  }
  .com__content__left__card__header__text {
    font-weight: 700;
    color: #0c327d;
    flex: 1;
  }
  .com__content__left__card__header__img {
    width: 18px;
    height: 18px;
    filter: drop-shadow(1px 1px 3px rgba(0, 0, 0, 0.3));
  }
  .com__content__left__card__content {
    padding: 5px 10px;
    background: linear-gradient(
      to right,
      rgb(180, 200, 251) 0%,
      rgb(164, 185, 251) 50%,
      rgb(180, 200, 251) 100%
    );
  }
  .com__content__left__card__row {
    display: flex;
    margin-bottom: 2px;
  }

  .com__content__left__card__img {
    width: 14px;
    height: 14px;
    margin-right: 5px;
  }
  .com__content__left__card__text {
    font-size: 10px;
    line-height: 14px;
    color: #0c327d;
    &.black {
      color: #000;
    }
    &.bold {
      font-weight: bold;
    }
    &.link:hover {
      cursor: pointer;
      color: #2b72ff;
      text-decoration: underline;
    }
  }
  .com__content__right {
    overflow-y: auto;
    background-color: #fff;
    flex: 1;
    padding: 5px;
  }
  .com__content__right__card__header {
    font-weight: 700;
    padding: 2px 0 3px 12px;
    position: relative;
    &:after {
      content: '';
      display: block;
      background: linear-gradient(to right, #70bfff 0, #fff 100%);
      position: absolute;
      bottom: 0;
      left: 0;
      height: 1px;
      width: calc(100% - 12px);
    }
  }
  .com__content__right__card__content {
    display: flex;
    padding-right: 0;
    flex-wrap: wrap;
    padding: 15px 0 0 12px;
  }
  /* .com__content__right__card__item moved up */
  .com__content__right__card__img {
    width: 45px;
    height: 45px;
    margin-right: 5px;
  }
  .com__content__right__card__text {
    white-space: nowrap;
  }
`;
