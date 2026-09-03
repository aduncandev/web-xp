import styled from 'styled-components';
import { TASKBAR_HEIGHT } from '../constants';

export const Container = styled.footer`
  height: ${TASKBAR_HEIGHT}px;
  image-rendering: pixelated;
  /* the style's TaskBar.BackgroundBottom bitmap; the gradient is the fallback.
     The same bitmap stretched underneath fills the hairlines a fractional
     device pixel ratio leaves between the slices (see UNDERLAY_PARTS) */
  border: 0 solid transparent;
  border-image: var(--xp-p-taskbar-backgroundbottom-1, none);
  background-size: 100% 100%, auto;
  background-repeat: no-repeat, repeat;
  background-image: var(--xp-u-taskbar-backgroundbottom-1, none),
    var(
      --xp-taskbar,
      linear-gradient(
        to bottom,
        #1f2f86 0,
        #3165c4 3%,
        #3682e5 6%,
        #4490e6 10%,
        #3883e5 12%,
        #2b71e0 15%,
        #2663da 18%,
        #235bd6 20%,
        #2258d5 23%,
        #2157d6 38%,
        #245ddb 54%,
        #2562df 86%,
        #245fdc 89%,
        #2158d4 92%,
        #1d4ec0 95%,
        #1941a5 98%
      )
    );
  position: absolute;
  bottom: 0;
  right: 0;
  left: 0;
  display: flex;
  .footer__items.left {
    height: 100%;
    flex: 1;
    overflow: hidden;
  }
  .footer__items.right {
    background-color: #0b77e9;
    flex-shrink: 0;
    background: var(
      --xp-tray,
      linear-gradient(
        to bottom,
        #0c59b9 1%,
        #139ee9 6%,
        #18b5f2 10%,
        #139beb 14%,
        #1290e8 19%,
        #0d8dea 63%,
        #0d9ff1 81%,
        #0f9eed 88%,
        #119be9 91%,
        #1392e2 94%,
        #137ed7 97%,
        #095bc9 100%
      )
    );
    /* the tray's own bitmap fades in from the left over 34px */
    border: 0 solid transparent;
    border-image: var(--xp-p-traynotifyhoriz-traynotify-background-1, none);
    background-image: var(--xp-u-traynotifyhoriz-traynotify-background-1, none);
    background-size: 100% 100%;
    background-repeat: no-repeat;
    border-left: 1px solid var(--xp-tray-border, transparent);
    box-shadow: inset 1px 0 1px var(--xp-tray-inset, transparent);
    padding: 0 8px 0 19px;
    margin-left: 4px;
  }
  .footer__items {
    display: flex;
    align-items: center;
  }
  /* The dotted grip at the head of each toolbar, drawn only while the
     taskbar is unlocked */
  .footer__grip {
    flex-shrink: 0;
    width: 3px;
    height: 22px;
    margin: 0 4px 0 2px;
    background-image: radial-gradient(
        circle at 1px 1px,
        rgba(255, 255, 255, 0.85) 0.6px,
        transparent 0.7px
      ),
      radial-gradient(
        circle at 2px 2px,
        rgba(0, 0, 60, 0.55) 0.6px,
        transparent 0.7px
      );
    background-size: 3px 3px;
  }
  .footer__quicklaunch {
    display: flex;
    align-items: center;
    gap: 1px;
    padding: 0 3px 0 2px;
    margin-right: 7px;
    flex-shrink: 0;
  }
  /* Toolbar-button chrome like the real Quick Launch: flat until hovered,
     then a raised 1px bevel; sunken while pressed */
  .footer__ql {
    box-sizing: content-box;
    width: 16px;
    height: 16px;
    padding: 2px;
    border: 1px solid transparent;
    cursor: pointer;
    &:hover {
      border-color: rgba(255, 255, 255, 0.7) rgba(0, 0, 60, 0.45)
        rgba(0, 0, 60, 0.45) rgba(255, 255, 255, 0.7);
      background: rgba(255, 255, 255, 0.12);
    }
    &:active {
      border-color: rgba(0, 0, 60, 0.45) rgba(255, 255, 255, 0.7)
        rgba(255, 255, 255, 0.7) rgba(0, 0, 60, 0.45);
      background: rgba(0, 0, 60, 0.08);
    }
  }
  /* Start: the style's button bitmap (three states), the flag, and the word
     in Franklin Gothic Medium with the style's shadow */
  .footer__start {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 100%;
    margin: 0 7px 0 0;
    padding: 2px 20px 4px 10px;
    border: 0 solid transparent;
    border-image: var(--xp-p-start-button-1, none);
    background-image: var(--xp-u-start-button-1, none);
    background-size: 100% 100%;
    background-repeat: no-repeat;
    image-rendering: pixelated;
    color: var(--xp-start-text, #fff);
    /* 97px wide on XP: the flag, the word in Franklin Gothic Medium */
    font: italic 700 17px 'Franklin Gothic Medium', 'Franklin Gothic',
      'Trebuchet MS', sans-serif;
    text-shadow: 2px 2px var(--xp-start-text-shadow, #454c10);
    cursor: default;
    outline: none;
  }
  .footer__start:hover {
    border-image: var(--xp-p-start-button-2, none);
    background-image: var(--xp-u-start-button-2, none);
  }
  .footer__start.active {
    border-image: var(--xp-p-start-button-3, none);
    background-image: var(--xp-u-start-button-3, none);
  }
  .footer__start__flag {
    width: 25px;
    height: 20px;
  }
  .footer__startc {
    display: none;
  }
  .footer__start__menu {
    position: absolute;
    left: 0;
    bottom: 100%;
  }
  /* task buttons: the style's TaskBand button, six states */
  /* the bitmap has three clear rows above its edge and two below, so a
     button the bar's full 30px puts the visible face at 3px, 25 tall, as XP */
  .footer__window {
    background-size: 100% 100%;
    background-repeat: no-repeat;
    flex: 1;
    max-width: 162px;
    color: var(--xp-taskbtn-text, #fff);
    margin: 0;
    padding: 0 8px;
    height: 30px;
    font-size: var(--xp-font-ui, 11px);
    background-color: var(--xp-taskbtn, transparent);
    border: 0 solid transparent;
    border-image: var(--xp-p-taskband-toolbar-button-1, none);
    background-image: var(--xp-u-taskband-toolbar-button-1, none);
    position: relative;
    image-rendering: pixelated;
    display: flex;
    align-items: center;
  }
  .footer__icon {
    height: 15px;
    width: 15px;
  }
  .footer__text {
    position: absolute;
    left: 27px;
    right: 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .footer__window.cover:hover {
    background-color: var(--xp-taskbtn-hover, transparent);
    border-image: var(--xp-p-taskband-toolbar-button-2, none);
    background-image: var(--xp-u-taskband-toolbar-button-2, none);
  }
  .footer__window.cover:hover:active {
    background-color: var(--xp-taskbtn-active, transparent);
    border-image: var(--xp-p-taskband-toolbar-button-3, none);
    background-image: var(--xp-u-taskband-toolbar-button-3, none);
  }
  .footer__window.focus {
    background-color: var(--xp-taskbtn-active, transparent);
    border-image: var(--xp-p-taskband-toolbar-button-5, none);
    background-image: var(--xp-u-taskband-toolbar-button-5, none);
  }
  .footer__window.focus:hover {
    background-color: var(--xp-taskbtn-active, transparent);
    border-image: var(--xp-p-taskband-toolbar-button-6, none);
    background-image: var(--xp-u-taskband-toolbar-button-6, none);
  }
  .footer__window.focus:hover:active {
    border-image: var(--xp-p-taskband-toolbar-button-3, none);
    background-image: var(--xp-u-taskband-toolbar-button-3, none);
  }
  .footer__time {
    margin: 0 5px;
    color: var(--xp-taskbtn-text, #fff);
    font-size: var(--xp-font-ui, 11px);
    font-weight: lighter;
    text-shadow: none;
  }
`;
