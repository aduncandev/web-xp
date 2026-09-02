import styled from 'styled-components';
import { taskPaneCss } from '../Explorer/styles';

export const Root = styled.div`
  /* A flex sibling, not an overlay: the Folders tree renders beside this
     when Explorer's pane is open, and absolute-inset would paper over it. */
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  font-family: Tahoma, 'Noto Sans', sans-serif;
  font-size: 11px;
  background: linear-gradient(to right, #edede5 0%, #ede8cd 100%);

  .cp__body {
    flex: 1;
    display: flex;
    overflow: hidden;
    border: 1px solid rgba(0, 0, 0, 0.4);
    border-top-width: 0;
    background: #fff;
  }

  ${taskPaneCss}

  .cp__main {
    flex: 1;
    overflow-y: auto;
    padding: 18px 22px;
    position: relative;
  }
  .cp__watermark {
    position: absolute;
    right: 6px;
    bottom: 6px;
    opacity: 0.08;
    pointer-events: none;
  }
  /* Real art, ghosted into the periwinkle like the original */
  .cp__watermark--real {
    right: 14px;
    bottom: 10px;
    filter: grayscale(1) brightness(0.55);
    opacity: 0.18;
  }
  .cp__title {
    font-size: 15px;
    font-weight: 700;
    color: #003399;
    border-bottom: 1px solid #becbe8;
    padding-bottom: 6px;
    margin-bottom: 16px;
  }
  /* Category home: solid periwinkle body, pale Franklin Gothic heading,
     bold WHITE labels — per control-panel-category.png (#6375D6 body,
     #D6DFF5 heading). Categories fill column-wise: first five down the
     left, the rest down the right, exactly like the real page. */
  .cp__main--home {
    background: #6375d6;
  }
  .cp__main--home .cp__title {
    font-family: 'Franklin Gothic Medium', Tahoma, sans-serif;
    font-size: 26px;
    font-weight: 400;
    color: #d6dff5;
    border-bottom: none;
    padding-bottom: 0;
    margin-bottom: 20px;
  }
  .cp__main--home .cp__grid {
    grid-auto-flow: column;
    grid-template-rows: repeat(5, min-content);
  }
  .cp__main--home .cp__tile-label {
    color: #ffffff;
    font-weight: 700;
  }
  .cp__main--home .cp__tile:hover {
    background: rgba(255, 255, 255, 0.14);
  }
  .cp__main--home .cp__tile:hover .cp__tile-label {
    color: #ffffff;
  }
  .cp__main--home .cp__watermark {
    opacity: 0.16;
  }
  .cp__grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 18px;
    position: relative;
    z-index: 1;
  }
  .cp__tile {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    border-radius: 3px;
    cursor: pointer;
    &:hover {
      background: #e8effc;
    }
    &:hover .cp__tile-label {
      color: #428eff;
      text-decoration: underline;
    }
  }
  .cp__tile-label {
    color: #215dc6;
    font-size: 12px;
    font-weight: 700;
  }

  .cp__classic-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    gap: 18px 10px;
    position: relative;
    z-index: 1;
  }
  .cp__applet {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    text-align: center;
    padding: 6px 2px;
    cursor: default;
    border: 1px solid transparent;
    &:hover {
      background: #e8effc;
      border-color: #b8c7e8;
    }
  }

  .cp__cat-header {
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid #becbe8;
    padding-bottom: 8px;
    margin-bottom: 14px;
  }
  .cp__cat-title {
    font-size: 15px;
    font-weight: 700;
    color: #003399;
  }
  .cp__subtitle {
    font-size: 12px;
    font-weight: 700;
    color: #003399;
    margin: 14px 0 8px;
  }
  .cp__tasks {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .cp__task {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #215dc6;
    padding: 4px 2px;
    cursor: pointer;
    &:hover {
      color: #428eff;
      text-decoration: underline;
    }
  }
  .cp__task--inert {
    cursor: default;
    &:hover {
      color: #215dc6;
      text-decoration: none;
    }
  }
  .cp__task-arrow {
    color: #4d6185;
    font-size: 10px;
  }

  .cp__ua-banner {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 15px;
    font-weight: 700;
    color: #003399;
    border-bottom: 1px solid #becbe8;
    padding-bottom: 8px;
  }
  .cp__ua-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 14px;
  }
  .cp__ua-tile {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px;
    border: 1px solid #becbe8;
    border-radius: 3px;
    cursor: pointer;
    background: linear-gradient(to bottom, #ffffff, #eef2fb);
    &:hover {
      border-color: var(--xp-highlight, #316ac5);
      background: #e8effc;
    }
    img {
      border: 1px solid #8ca3d6;
      border-radius: 2px;
    }
  }
  .cp__check {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 4px 0 2px;
    cursor: pointer;
    input {
      margin: 0;
    }
  }
  /*
   * Stands in for the tasks on somebody else's protected account. It is
   * often the only thing in the task list, so it carries its own top gap
   * rather than relying on a sibling above it, and wraps well short of
   * the pane so it reads as a note rather than a paragraph of body copy.
   */
  .cp__pw-note {
    margin: 14px 0 10px 20px;
    max-width: 42ch;
    line-height: 1.55;
    color: #555;
  }
  .cp__hint {
    margin: 0 0 10px 20px;
    max-width: 460px;
    line-height: 1.5;
    color: #444;
  }
  .cp__ua-name {
    font-size: 13px;
    font-weight: 700;
    color: #003399;
  }
  .cp__ua-kind {
    color: #5a6b8c;
  }

  .cp__input {
    width: 260px;
    height: 21px;
    border: 1px solid var(--xp-select-border, #7f9db9);
    padding: 2px 4px;
    font-family: Tahoma, 'Noto Sans', sans-serif;
    font-size: 11px;
    outline: none;
    margin-bottom: 10px;
  }
  .cp__pwform {
    display: flex;
    flex-direction: column;
    margin-top: 4px;

    label {
      font-size: 11px;
      margin-bottom: 3px;
    }
  }
  .cp__pwnote {
    font-size: 11px;
    color: #5a6b8c;
    max-width: 340px;
    margin-bottom: 12px;
  }
  .cp__avatar-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 6px 0 14px;
    max-width: 340px;
  }
  .cp__avatar {
    border: 2px solid transparent;
    border-radius: 3px;
    cursor: pointer;
    &:hover {
      border-color: #b8c7e8;
    }
  }
  .cp__avatar--sel {
    border-color: var(--xp-highlight, #316ac5);
  }
  .cp__buttons {
    display: flex;
    gap: 6px;
    margin-top: 8px;
  }

  .cp__dt {
    display: flex;
    gap: 24px;
    align-items: flex-start;
  }
  .cp__dt-cal {
    border: 1px solid #becbe8;
    padding: 8px;
    border-radius: 3px;
  }
  .cp__dt-month {
    text-align: center;
    font-weight: 700;
    color: #003399;
    margin-bottom: 6px;
  }
  .cp__dt-grid {
    display: grid;
    grid-template-columns: repeat(7, 24px);
  }
  .cp__dt-cell {
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .cp__dt-cell--head {
    font-weight: 700;
    color: #5a6b8c;
  }
  .cp__dt-cell--today {
    background: var(--xp-highlight, #316ac5);
    color: #fff;
    border-radius: 2px;
  }
  .cp__dt-time {
    font-size: 18px;
    font-weight: 700;
  }
  .cp__dt-zone {
    color: #5a6b8c;
    margin: 4px 0 10px;
  }
  .cp__dt-note {
    color: #5a6b8c;
    max-width: 220px;
  }
`;

