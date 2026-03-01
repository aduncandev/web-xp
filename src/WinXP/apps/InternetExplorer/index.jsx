import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled from 'styled-components';

import { WindowDropDowns } from 'components';
import dropDownDataFromImport from './dropDownData';
import ie from 'assets/windowsIcons/ie-paper.png';
import printer from 'assets/windowsIcons/17(32x32).png';
import go from 'assets/windowsIcons/290.png';
import links from 'assets/windowsIcons/links.png';
import search from 'assets/windowsIcons/299(32x32).png';
import favorite from 'assets/windowsIcons/744(32x32).png';
import backIcon from 'assets/windowsIcons/back.png';
import earth from 'assets/windowsIcons/earth.png';
import edit from 'assets/windowsIcons/edit.png';
import forwardIcon from 'assets/windowsIcons/forward.png';
import historyIcon from 'assets/windowsIcons/history.png';
import homeIcon from 'assets/windowsIcons/home.png';
import mail from 'assets/windowsIcons/mail.png';
import msn from 'assets/windowsIcons/msn.png';
import refreshIcon from 'assets/windowsIcons/refresh.png';
import stopIcon from 'assets/windowsIcons/stop.png';
import windows from 'assets/windowsIcons/windows.png';
import dropdown from 'assets/windowsIcons/dropdown.png';

const DEFAULT_HOME_PAGE = 'https://www.google.com/webhp?igu=1';
const IFRAME_LOAD_TIMEOUT = 60000; // 60 seconds

// Simple styled component for the error page
const IframeErrorDiv = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #f0f0f0;
  padding: 20px;
  box-sizing: border-box;
  text-align: center;
  font-family: 'Tahoma', sans-serif;
  color: #333;

  h3 {
    font-size: 18px;
    color: #cc0000;
    margin-bottom: 15px;
  }
  p {
    font-size: 14px;
    line-height: 1.6;
  }
  ul {
    list-style-type: disc;
    margin-left: 20px;
    text-align: left;
  }
`;

function InternetExplorer({ onClose }) {
  const iframeRef = useRef(null);
  const loadTimeoutRef = useRef(null);

  const [currentUrl, setCurrentUrl] = useState(DEFAULT_HOME_PAGE);
  const [addressBarInput, setAddressBarInput] = useState(DEFAULT_HOME_PAGE);
  const [historyStack, setHistoryStack] = useState([DEFAULT_HOME_PAGE]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [showCustomErrorPage, setShowCustomErrorPage] = useState(false);
  const [iframeKey, setIframeKey] = useState(Date.now()); // To help re-trigger iframe load

  useEffect(() => {
    setAddressBarInput(currentUrl);
  }, [currentUrl]);

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []);

  const navigateToUrl = useCallback(
    (url, addToHistory = true) => {
      setIsLoading(true);
      setShowCustomErrorPage(false); // Reset error page on new navigation

      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }

      let finalUrl = url.trim();
      if (finalUrl === '') {
        finalUrl = DEFAULT_HOME_PAGE; // Or about:blank
      } else if (
        !/^https?:\/\//i.test(finalUrl) &&
        !finalUrl.startsWith('about:')
      ) {
        finalUrl = `http://${finalUrl}`;
      }

      // Set a timeout to detect if loading fails or gets stuck (e.g. X-Frame-Options)
      loadTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        // Check if iframe src is still what we set it to, or if it's blank,
        // and if the iframe contentWindow is accessible and its location is about:blank
        // This check is not perfectly reliable due to cross-origin restrictions
        if (iframeRef.current) {
          try {
            // If contentWindow is null or its location is about:blank when it shouldn't be
            if (
              !iframeRef.current.contentWindow ||
              iframeRef.current.contentWindow.location.href === 'about:blank'
            ) {
              if (finalUrl !== 'about:blank') {
                setShowCustomErrorPage(true);
              }
            }
          } catch (e) {
            // Accessing contentWindow.location.href might throw a cross-origin error
            // which itself can be an indicator of a problem or a successful cross-origin load.
            // If it throws and we are here via timeout, likely it's blocked.
            setShowCustomErrorPage(true);
          }
        } else {
          setShowCustomErrorPage(true);
        }
      }, IFRAME_LOAD_TIMEOUT);

      setCurrentUrl(finalUrl); // This will trigger iframe src change

      if (addToHistory) {
        const newHistory = historyStack.slice(0, historyIndex + 1);
        // Avoid adding duplicate consecutive entries
        if (newHistory[newHistory.length - 1] !== finalUrl) {
          newHistory.push(finalUrl);
          setHistoryStack(newHistory);
          setHistoryIndex(newHistory.length - 1);
        } else if (newHistory.length === 0) {
          // If history was empty
          newHistory.push(finalUrl);
          setHistoryStack(newHistory);
          setHistoryIndex(newHistory.length - 1);
        }
      }
    },
    [historyStack, historyIndex],
  );

  const handleLoadUrl = () => {
    navigateToUrl(addressBarInput);
  };

  const goHome = () => {
    navigateToUrl(DEFAULT_HOME_PAGE);
  };

  const goBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      navigateToUrl(historyStack[newIndex], false);
    }
  };

  const goForward = () => {
    if (historyIndex < historyStack.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      navigateToUrl(historyStack[newIndex], false);
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setShowCustomErrorPage(false);
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    // One way to force a refresh is to change the key of the iframe
    setIframeKey(Date.now());
    // Or, if currentUrl is already set, ensure navigateToUrl will re-initiate loading
    // by slightly changing URL or re-calling navigateToUrl
    // For simplicity, navigateToUrl handles the loading timeout and state resets.
    navigateToUrl(currentUrl, false); // navigate to current URL, don't add to history again
  };

  const handleStop = () => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    setIsLoading(false);
    // Setting src to about:blank is a common way to "stop" an iframe
    if (iframeRef.current) {
      iframeRef.current.src = 'about:blank';
    }
    // Optionally, update currentUrl and history if desired
    // navigateToUrl('about:blank', true);
    // setShowCustomErrorPage(false); // Don't show error on stop
  };

  const handleIframeLoad = () => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    setIsLoading(false);
    // If iframe loads 'about:blank' and the intended URL was not 'about:blank',
    // it might indicate an issue (e.g. blocked by X-Frame-Options, browser shows its own blank error).
    // This is a heuristic and might not always be accurate.
    if (iframeRef.current) {
      try {
        if (
          iframeRef.current.contentWindow &&
          iframeRef.current.contentWindow.location.href === 'about:blank' &&
          currentUrl !== 'about:blank' &&
          currentUrl !== ''
        ) {
          // It loaded 'about:blank' when it shouldn't have.
          // This may happen if the site blocks iframe loading.
          setShowCustomErrorPage(true);
        } else {
          setShowCustomErrorPage(false); // Explicitly hide error page on successful load
        }
      } catch (e) {
        // Cross-origin error trying to access contentWindow.location.href.
        // This usually means the page HAS loaded something (either the page or a browser error page for it)
        // but we can't inspect it. If our timeout didn't fire, we assume it's okay or browser handled.
        setShowCustomErrorPage(false);
      }
    }
  };

  const handleIframeError = () => {
    // This event is not reliably fired for X-Frame-Options issues.
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    setIsLoading(false);
    setShowCustomErrorPage(true);
  };

  function onClickOptionItem(item) {
    switch (item) {
      case 'Close':
        onClose();
        break;
      case 'Home Page':
        goHome();
        break;
      case 'Back':
        goBack();
        break;
      case 'Forward':
        goForward();
        break;
      case 'Refresh':
        handleRefresh();
        break;
      case 'Stop':
        handleStop();
        break;
      default:
    }
  }
  return (
    <Div>
      <section className="ie__toolbar">
        <div className="ie__options">
          <WindowDropDowns
            items={dropDownDataFromImport}
            onClickItem={onClickOptionItem}
            height={21}
          />
        </div>
        <img className="ie__windows-logo" src={windows} alt="windows" />
      </section>
      <section className="ie__function_bar">
        <div
          onClick={goBack}
          className={`ie__function_bar__button${
            historyIndex === 0 || isLoading ? '--disable' : ''
          }`}
        >
          <img className="ie__function_bar__icon" src={backIcon} alt="Back" />
          <span className="ie__function_bar__text">Back</span>
          <div className="ie__function_bar__arrow" />
        </div>
        <div
          onClick={goForward}
          className={`ie__function_bar__button${
            historyIndex >= historyStack.length - 1 || isLoading
              ? '--disable'
              : ''
          }`}
        >
          <img
            className="ie__function_bar__icon"
            src={forwardIcon}
            alt="Forward"
          />
          <div className="ie__function_bar__arrow" />
        </div>
        <div className="ie__function_bar__button" onClick={handleStop}>
          <img
            className="ie__function_bar__icon--margin-1"
            src={stopIcon}
            alt="Stop"
          />
        </div>
        <div
          className={`ie__function_bar__button${isLoading ? '--disable' : ''}`}
          onClick={!isLoading ? handleRefresh : undefined}
        >
          <img
            className="ie__function_bar__icon--margin-1"
            src={refreshIcon}
            alt="Refresh"
          />
        </div>
        <div
          className={`ie__function_bar__button${isLoading ? '--disable' : ''}`}
          onClick={!isLoading ? goHome : undefined}
        >
          <img
            className="ie__function_bar__icon--margin-1"
            src={homeIcon}
            alt="Home"
          />
        </div>
        <div className="ie__function_bar__separate" />
        <div className="ie__function_bar__button">
          <img
            className="ie__function_bar__icon--normalize "
            src={search}
            alt="Search"
          />
          <span className="ie__function_bar__text">Search</span>
        </div>
        <div className="ie__function_bar__button">
          <img
            className="ie__function_bar__icon--normalize"
            src={favorite}
            alt="Favorites"
          />
          <span className="ie__function_bar__text">Favorites</span>
        </div>
        <div className="ie__function_bar__button">
          <img
            className="ie__function_bar__icon"
            src={historyIcon}
            alt="History"
          />
        </div>
        <div className="ie__function_bar__separate" />
        <div className="ie__function_bar__button">
          <img
            className="ie__function_bar__icon--margin-1"
            src={mail}
            alt="Mail"
          />
          <div className="ie__function_bar__arrow--margin-11" />
        </div>
        <div className="ie__function_bar__button">
          <img
            className="ie__function_bar__icon--margin12"
            src={printer}
            alt="Print"
          />
        </div>
        <div className="ie__function_bar__button--disable">
          <img className="ie__function_bar__icon" src={edit} alt="Edit" />
        </div>
        <div className="ie__function_bar__button">
          <img
            className="ie__function_bar__icon--margin12"
            src={msn}
            alt="MSN"
          />
        </div>
      </section>
      <section className="ie__address_bar">
        <div className="ie__address_bar__title">Address</div>
        <div className="ie__address_bar__content">
          <img src={ie} alt="ie" className="ie__address_bar__content__img" />
          <input
            type="text"
            className="ie__address_bar__content__input"
            value={addressBarInput}
            onChange={e => setAddressBarInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !isLoading) {
                handleLoadUrl();
              }
            }}
            disabled={isLoading}
          />
          <img
            src={dropdown}
            alt="dropdown"
            className="ie__address_bar__content__dropdown-img"
          />
        </div>
        <div
          className={`ie__address_bar__go ${
            isLoading ? 'ie__address_bar__go--disabled' : ''
          }`}
          onClick={!isLoading ? handleLoadUrl : undefined}
        >
          <img className="ie__address_bar__go__img" src={go} alt="go" />
          <span className="ie__address_bar__go__text">Go</span>
        </div>
        <div className="ie__address_bar__separate" />
        <div className="ie__address_bar__links">
          <span className="ie__address_bar__links__text">Links</span>
          <img
            className="ie__address_bar__links__img"
            src={links}
            alt="links"
          />
        </div>
      </section>
      <div className="ie__content">
        {showCustomErrorPage ? (
          <IframeErrorDiv>
            <h3>Navigation Canceled</h3>
            <p>The website could not be displayed in the application.</p>
            <p>This might be because:</p>
            <ul>
              <li>
                The website does not allow itself to be embedded in other pages
                (e.g., due to X-Frame-Options).
              </li>
              <li>
                The address is incorrect or the website is temporarily
                unavailable.
              </li>
              <li>A network connection issue occurred.</li>
            </ul>
            <p>Please try a different URL or check your internet connection.</p>
          </IframeErrorDiv>
        ) : (
          <iframe
            key={iframeKey} // Changing key can help force re-render/reload
            ref={iframeRef}
            src={currentUrl}
            className="ie__content__iframe"
            title="Internet Explorer Content"
            sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-presentation allow-same-origin allow-scripts"
            onLoad={handleIframeLoad}
            onError={handleIframeError} // Though not always reliable for X-Frame-Options
          />
        )}
      </div>
      <footer className="ie__footer">
        <div className="ie__footer__status">
          <img className="ie__footer__status__img" src={ie} alt="" />
          <span className="ie__footer__status__text">
            {isLoading
              ? 'Loading...'
              : showCustomErrorPage
              ? 'Navigation Canceled'
              : 'Done'}
          </span>
        </div>
        <div className="ie__footer__block" />
        <div className="ie__footer__block" />
        <div className="ie__footer__block" />
        <div className="ie__footer__block" />
        <div className="ie__footer__right">
          <img className="ie__footer__right__img" src={earth} alt="Internet" />
          <span className="ie__footer__right__text">Internet</span>
          <div className="ie__footer__right__dots" />
        </div>
      </footer>
    </Div>
  );
}

const Div = styled.div`
  height: 100%;
  width: 100%;
  position: absolute;
  display: flex;
  overflow: hidden;
  flex-direction: column;
  background: linear-gradient(to right, #edede5 0%, #ede8cd 100%);

  .ie__toolbar {
    position: relative;
    display: flex;
    align-items: center;
    line-height: 100%;
    height: 24px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.7);
    flex-shrink: 0;
  }
  .ie__options {
    height: 23px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.15);
    border-right: 1px solid rgba(0, 0, 0, 0.15);
    padding-left: 2px;
    flex: 1;
  }
  .ie__windows-logo {
    height: 100%;
    border-left: 1px solid white;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  }
  .ie__function_bar {
    height: 36px;
    display: flex;
    align-items: center;
    font-size: 11px;
    padding: 1px 3px 0;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    user-select: none;
  }
  .ie__function_bar__button {
    cursor: pointer;
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
  .ie__function_bar__button--disable {
    filter: grayscale(1);
    opacity: 0.7;
    display: flex;
    height: 100%;
    align-items: center;
    border: 1px solid rgba(0, 0, 0, 0);
    cursor: default;
    pointer-events: none; /* Prevent clicks when disabled */
  }
  .ie__function_bar__text {
    margin-right: 4px;
  }
  .ie__function_bar__icon {
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
  .ie__function_bar__separate {
    height: 90%;
    width: 1px;
    background-color: rgba(0, 0, 0, 0.2);
    margin: 0 2px;
  }
  .ie__function_bar__arrow {
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
  .ie__function_bar__arrow--margin-11 {
    height: 100%;
    display: flex;
    align-items: center;
    margin: 0 1px 0 -1px;
    &:before {
      content: '';
      display: block;
      border-width: 3px 3px 0;
      border-color: #000 transparent;
      border-style: solid;
    }
  }
  .ie__address_bar {
    border-top: 1px solid rgba(255, 255, 255, 0.7);
    height: 22px;
    font-size: 11px;
    display: flex;
    align-items: center;
    padding: 0 2px 2px;
    box-shadow: inset 0 -2px 3px -1px #2d2d2d;
  }
  .ie__address_bar__title {
    line-height: 100%;
    color: rgba(0, 0, 0, 0.5);
    padding: 5px;
    user-select: none;
  }
  .ie__address_bar__content {
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
      margin: 0 1px;
    }
    &__input {
      flex: 1;
      height: 100%;
      border: none;
      outline: none;
      padding: 0 2px;
      font-size: 11px;
      width: 100%;
      &:disabled {
        background-color: #f0f0f0; // Slightly different background when disabled
        color: #a0a0a0;
      }
    }
    &__dropdown-img {
      width: 15px;
      height: 15px;
      cursor: pointer;
      &:hover {
        filter: brightness(1.1);
      }
    }
  }
  .ie__address_bar__go {
    display: flex;
    align-items: center;
    padding: 0 18px 0 5px;
    height: 100%;
    position: relative;
    cursor: pointer;
    user-select: none;
    &__img {
      height: 95%;
      border: 1px solid rgba(255, 255, 255, 0.2);
      margin-right: 3px;
    }
  }
  .ie__address_bar__go--disabled {
    cursor: default;
    opacity: 0.6;
    pointer-events: none;
  }
  .ie__address_bar__links {
    display: flex;
    align-items: center;
    padding: 0 18px 0 5px;
    height: 100%;
    position: relative;
    user-select: none;
    &__img {
      position: absolute;
      right: 2px;
      top: 3px;
      height: 5px;
      width: 8px;
    }
    &__text {
      color: rgba(0, 0, 0, 0.5);
    }
  }
  .ie__address_bar__separate {
    height: 100%;
    width: 1px;
    background-color: rgba(0, 0, 0, 0.1);
    box-shadow: 1px 0 rgba(255, 255, 255, 0.7);
  }
  .ie__content {
    flex: 1;
    overflow: hidden;
    padding-left: 1px;
    border-left: 1px solid #6f6f6f;
    background-color: #f1f1f1;
    position: relative;
  }
  .ie__content__iframe {
    width: 100%;
    height: 100%;
    border: none;
  }
  .ie__footer {
    height: 20px;
    border-top: 1px solid transparent;
    box-shadow: inset 0 1px 3px rgba(50, 50, 50, 0.8);
    background-color: rgb(236, 233, 216);
    display: flex;
    align-items: center;
    padding-top: 2px;
    user-select: none;
  }
  .ie__footer__status {
    flex: 1;
    height: 100%;
    display: flex;
    align-items: center;
    padding-left: 2px;
    &__text {
      font-size: 11px;
    }
    &__img {
      height: 14px;
      width: 14px;
      margin-right: 3px;
    }
  }
  .ie__footer__block {
    height: 85%;
    width: 22px;
    border-left: 1px solid rgba(0, 0, 0, 0.15);
    box-shadow: inset 1px 0 rgba(255, 255, 255, 0.7);
  }
  .ie__footer__right {
    display: flex;
    align-items: center;
    width: 150px;
    height: 80%;
    border-left: 1px solid rgba(0, 0, 0, 0.11);
    box-shadow: inset 1px 0 rgba(255, 255, 255, 0.7);
    padding-left: 5px;
    position: relative;
    &__text {
      font-size: 11px;
    }
    &__img {
      height: 14px;
      width: 14px;
      margin-right: 3px;
    }
    &__dots {
      position: absolute;
      right: 11px;
      bottom: -1px;
      width: 2px;
      height: 2px;
      box-shadow: 2px 0px rgba(0, 0, 0, 0.25), 5.5px 0px rgba(0, 0, 0, 0.25),
        9px 0px rgba(0, 0, 0, 0.25), 5.5px -3.5px rgba(0, 0, 0, 0.25),
        9px -3.5px rgba(0, 0, 0, 0.25), 9px -7px rgba(0, 0, 0, 0.25),
        3px 1px rgba(255, 255, 255, 1), 6.5px 1px rgba(255, 255, 255, 1),
        10px 1px rgba(255, 255, 255, 1), 10px -2.5px rgba(255, 255, 255, 1),
        10px -6px rgba(255, 255, 255, 1);
    }
  }
`;
export default InternetExplorer;
