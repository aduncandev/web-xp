/*
 * The theme: every colour, bitmap and metric the shell chrome draws with,
 * as CSS custom properties on the document root, so windows, the taskbar,
 * the Start menu, menus, buttons, dialogs and every portal read the same
 * set. Two visual styles: Luna, the Windows XP style, drawn from the real
 * luna.msstyles bitmaps for its three colour schemes (lunaArt.js), and
 * Windows Classic, built from a scheme's system colours with classic.css
 * doing the 3D drawing.
 *
 * Luna parts are exposed as border-image values, `--xp-p-<part>-<state>`,
 * with the style's own nine slices, plus `--xp-g-<part>-<state>` for a
 * part's glyph and `--xp-i-<part>-<state>` for a plain state image. Under
 * Classic those variables are unset, so a component's `var(--xp-p-…, none)`
 * falls back to the colours.
 */
import { classicSchemeById, rgb } from './classicSchemes';
import {
  lunaFrameEdge,
  lunaImage,
  lunaMetrics,
  lunaPart,
  LUNA_SCHEMES,
} from './lunaArt';

export { LUNA_SCHEMES };
export const STYLE = { LUNA: 'luna', CLASSIC: 'classic' };

export const DEFAULT_APPEARANCE = {
  style: STYLE.LUNA,
  scheme: 'blue',
  fontSize: 'normal',
};

// Font size: the caption, menu, icon and tooltip text (dialog text stays).
// Luna's own sizes come from the style's Normal, Large Fonts and Extra
// Large Fonts INIs; ui is the 8pt/10pt/12pt Tahoma line in pixels.
export const FONT_SIZES = [
  {
    id: 'normal',
    name: 'Normal',
    ui: 11,
    caption: 13,
    lunaCaption: 25,
    classicCaption: 18,
  },
  {
    id: 'large',
    name: 'Large Fonts',
    ui: 13,
    caption: 16,
    lunaCaption: 31,
    classicCaption: 22,
  },
  {
    id: 'xlarge',
    name: 'Extra Large Fonts',
    ui: 16,
    caption: 19,
    lunaCaption: 37,
    classicCaption: 26,
  },
];

/** The parts the chrome draws, and where each one's glyph comes from. */
const PARTS = [
  'Window.Caption',
  'Window.MaxCaption',
  'Window.FrameLeft',
  'Window.FrameRight',
  'Window.FrameBottom',
  ['Window.CloseButton', 'imagefile3'],
  ['Window.MinButton', 'imagefile3'],
  ['Window.MaxButton', 'imagefile3'],
  ['Window.RestoreButton', 'imagefile3'],
  ['Window.HelpButton', 'imagefile3'],
  'TaskBar.BackgroundBottom',
  'TaskBand::Toolbar.Button',
  'Start::Button',
  'TrayNotifyHoriz::TrayNotify.Background',
  'StartPanel.UserPane',
  'StartPanel.UserPicture',
  'StartPanel.ProgList',
  'StartPanel.PlacesList',
  'StartPanel.Logoff',
  'StartPanel.MorePrograms',
  'StartPanel.ProgListSeparator',
  'StartPanel.PlacesListSeparator',
  'StartPanel.MoreProgramsArrow',
  'StartPanel.MoreProgramsArrow(hot)',
  'StartPanel.LogoffButtons',
  'StartPanel.LogoffButtons(hot)',
  'button.pushbutton',
  ['Combobox.DropDownButton', 'glyphimagefile'],
  ['ScrollBar.ArrowBtn', 'imagefile2'],
  'Scrollbar.ThumbBtnVert',
  'Scrollbar.ThumbBtnHorz',
  'Scrollbar.GripperVert',
  'Scrollbar.GripperHorz',
  'Scrollbar.LowerTrackVert',
  'Scrollbar.LowerTrackHorz',
  'Header.HeaderItem',
  'Tab.TabItem',
  'Tab.Pane',
  'Status',
  'Status.Pane',
  'Rebar',
  'Toolbar.Button',
  'ExplorerBar.NormalGroupHead',
  'ExplorerBar.NormalGroupBackground',
  'ExplorerBar.NormalGroupCollapse',
  'ExplorerBar.NormalGroupExpand',
  'ExplorerBar.SpecialGroupHead',
  'ExplorerBar.SpecialGroupBackground',
  'ExplorerBar.SpecialGroupCollapse',
  'ExplorerBar.SpecialGroupExpand',
  'Progress.Bar',
  'Progress.Chunk',
  'Tooltip.Close',
  'button.groupbox',
  'TrackBar.Thumb',
  'TrackBar.Track',
  'spin',
  ['Spin.Up', 'glyphimagefile'],
  ['Spin.Down', 'glyphimagefile'],
];
// state strips used as plain images: check boxes and radio buttons at 96 DPI
const IMAGES = [
  // scrollbar arrows are drawn at their own size, so the plain state image
  // can sit under the glyph; the thumbs' stretchable middles come from the
  // exporter's -mid slices
  ['ScrollBar.ArrowBtn', 'imagefile'],
  ['Scrollbar.ThumbBtnVert', 'imagefile', '-mid'],
  ['Scrollbar.ThumbBtnHorz', 'imagefile', '-mid'],
  ['button.checkbox', 'imagefile1'],
  ['button.radiobutton', 'imagefile1'],
  ['TreeView.Glyph', 'imagefile1'],
  ['StartPanel.ProgListSeparator', 'imagefile'],
  ['StartPanel.PlacesListSeparator', 'imagefile'],
  ['StartPanel.MoreProgramsArrow', 'imagefile'],
  ['StartPanel.MoreProgramsArrow(hot)', 'imagefile'],
  ['StartPanel.LogoffButtons', 'imagefile'],
  ['StartPanel.LogoffButtons(hot)', 'imagefile'],
  ['Scrollbar.GripperVert', 'imagefile'],
  ['Scrollbar.GripperHorz', 'imagefile'],
  ['ExplorerBar.NormalGroupCollapse', 'imagefile'],
  ['ExplorerBar.NormalGroupExpand', 'imagefile'],
  ['ExplorerBar.SpecialGroupCollapse', 'imagefile'],
  ['ExplorerBar.SpecialGroupExpand', 'imagefile'],
  ['Header.HeaderItem', 'imagefile'],
  ['Header', 'imagefile'],
  ['Window.MinButton', 'imagefile'],
  ['Window.MaxButton', 'imagefile'],
  ['Window.RestoreButton', 'imagefile'],
  ['Window.CloseButton', 'imagefile'],
  ['Window.HelpButton', 'imagefile'],
  ['Window.SmallCloseButton', 'imagefile'],
  ['TrackBar.ThumbBottom', 'imagefile1'],
];

// parts whose middle is painted separately (see --xp-pn-)
const NO_FILL_PARTS = ['Scrollbar.ThumbBtnVert', 'Scrollbar.ThumbBtnHorz'];

/*
 * Parts that also get their whole bitmap stretched under the nine slices,
 * as `--xp-u-<slug>-<n>`: a plain url, drawn at `100% 100%` by the site
 * that uses it. A browser at a fractional device pixel ratio
 * (Windows at 125% or 150%) rounds each slice's rectangle on its own and
 * leaves hairlines between them, which read as seams across a gradient.
 * The stretched copy underneath fills those with the part's own colours.
 */
const UNDERLAY_PARTS = [
  'Start::Button',
  'TaskBand::Toolbar.Button',
  'TaskBar.BackgroundBottom',
  'TrayNotifyHoriz.TrayNotify.Background',
  'StartPanel.UserPane',
  'StartPanel.Logoff',
  'ExplorerBar.NormalGroupHead',
  'ExplorerBar.NormalGroupBackground',
  'ExplorerBar.SpecialGroupHead',
  'ExplorerBar.SpecialGroupBackground',
];

/** "Window.CloseButton" -> "window-closebutton", the variable's middle. */
export const partSlug = section =>
  section
    .toLowerCase()
    .replace(/\(hot\)/g, '-hot')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const baseName = file =>
  file
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    .replace(/\.bmp$/i, '');

/** A part's state drawn as a border image with the style's nine slices. */
function borderImage(scheme, section, state) {
  const part = lunaPart(scheme, section);
  if (!part || !part.name) return null;
  const url = lunaImage(scheme, part.name, part.states > 1 ? state : 0);
  if (!url) return null;
  const { l, r, t, b } = part.sizing;
  const repeat = part.tile ? 'repeat' : 'stretch';
  return `url(${url}) ${t} ${r} ${b} ${l} fill / ${t}px ${r}px ${b}px ${l}px ${repeat}`;
}

/** The states of the bitmap a part property names, as image URLs. */
function imageStates(scheme, section, key, suffix = '') {
  const part = lunaPart(scheme, section);
  if (!part) return [];
  const file = part.props[key];
  if (!file) return [];
  const name = baseName(file);
  const count = Number(part.props.imagecount || 1);
  const out = [];
  for (let s = 1; s <= count; s++) {
    const url = suffix
      ? lunaImage(scheme, `${name}-${s}${suffix}`, 0)
      : lunaImage(scheme, name, count > 1 ? s : 0);
    if (url) out.push(url);
  }
  return out;
}

const c = (metrics, key, fallback) => {
  const v = metrics[key];
  return v ? rgb(v.trim()) : fallback;
};

/** Luna: the scheme's system colours from [SysMetrics] and its bitmaps. */
export function lunaTokens(scheme) {
  const m = lunaMetrics(scheme);
  const edge = lunaFrameEdge(scheme);
  const part = section => (lunaPart(scheme, section) || {}).props || {};
  const startBtn = part('Start::Button');
  const userPane = part('StartPanel.UserPane');
  const progList = part('StartPanel.ProgList');
  const placesList = part('StartPanel.PlacesList');
  const groupHead = part('ExplorerBar.NormalGroupHead');
  const groupBody = part('ExplorerBar.NormalGroupBackground');
  const explorerBar = part('ExplorerBar');
  const tokens = {
    face: c(m, 'btnface', '#ece9d8'),
    faceLight: c(m, 'btnhighlight', '#ffffff'),
    faceShadow: c(m, 'btnshadow', '#aca899'),
    faceDkShadow: c(m, 'dkshadow3d', '#716f64'),
    window: c(m, 'window', '#ffffff'),
    windowText: '#000000',
    highlight: c(m, 'highlight', '#316ac5'),
    highlightText: c(m, 'highlighttext', '#ffffff'),
    menu: c(m, 'menu', '#ffffff'),
    menuText: '#000000',
    menuHighlight: c(m, 'menuhilight', '#316ac5'),
    menuBorder: c(m, 'btnshadow', '#aca899'),
    menuBar: c(m, 'menubar', '#ece9d8'),
    grayText: c(m, 'graytext', '#aca899'),
    info: '#ffffe1',
    infoText: '#000000',
    desktop: c(m, 'background', '#004e98'),
    // the caption is a bitmap; these stay for text and for Classic's gradient
    captionActive: 'none',
    buttonText: '#000',
    tabPage: '#fdfdfa',
    groupBorder: rgb(
      (part('button.groupbox').bordercolorhint || '208 208 191').trim(),
    ),
    captionInactive: 'none',
    captionEdgeActive: 'transparent',
    captionEdgeInactive: 'transparent',
    captionText: c(m, 'captiontext', '#ffffff'),
    captionTextInactive: c(m, 'inactivecaptiontext', '#ffffff'),
    captionShadow: '#000000',
    // behind the frame's four pieces: a browser that lands an edge on a
    // half device pixel (Windows at 125% or 150%) leaves a hairline, and
    // it should show the frame's own colour, never the desktop
    frameActive: edge.active || 'transparent',
    frameInactive: edge.inactive || 'transparent',
    // the caption bitmap's top corners are rounded: this many rows at the
    // top stay clear of that colour so the desktop shows through them
    frameCorner: '6px',
    frameRadius: '0px',
    taskbar: 'none',
    tray: 'none',
    trayBorder: 'transparent',
    trayInset: 'transparent',
    taskbtn: 'transparent',
    taskbtnHover: 'transparent',
    taskbtnActive: 'transparent',
    taskbtnText: rgb(
      (part('TaskBand::Toolbar').textcolor || '255 255 255').trim(),
    ),
    startText: rgb((startBtn.textcolor || '255 255 255').trim()),
    startTextShadow: rgb((startBtn.textshadowcolor || '69 76 16').trim()),
    startHeader: 'none',
    startFooter: 'none',
    startBody: 'transparent',
    startRight: 'transparent',
    startRightText: rgb((placesList.textcolor || '10 36 106').trim()),
    startRightBorder: 'transparent',
    startHover: rgb((progList.hottracking || '48 112 208').trim()),
    startPlacesHover: rgb((placesList.hottracking || '80 150 248').trim()),
    startProgText: rgb((progList.textcolor || '55 55 56').trim()),
    startRule: 'transparent',
    startUserText: rgb((userPane.textcolor || '255 255 255').trim()),
    startUserShadow: rgb((userPane.textshadowcolor || '9 66 139').trim()),
    buttonBorder: 'transparent',
    buttonFace: 'none',
    buttonPressed: 'none',
    buttonFocus: 'transparent',
    buttonDisabledBorder: 'transparent',
    buttonDisabledFace: 'none',
    buttonDisabledText: c(m, 'graytext', '#a0a0a0'),
    selectBorder: rgb((part('Combobox').bordercolor || '127 157 185').trim()),
    submenuBorder: c(m, 'btnshadow', '#aca899'),
    submenuRule: 'transparent',
    explorerBarTop: rgb((explorerBar.gradientcolor1 || '140 170 230').trim()),
    explorerBarBottom: rgb(
      (explorerBar.gradientcolor2 || '100 135 220').trim(),
    ),
    groupHeadText: rgb((groupHead.textcolor || '33 93 198').trim()),
    groupText: rgb((groupBody.textcolor || '38 92 192').trim()),
    // the style names no hot colour for a group head; Blue's is the one XP
    // shows, the other schemes keep their text colour
    groupHeadHot:
      scheme === 'blue'
        ? '#428eff'
        : rgb((groupHead.textcolor || '33 93 198').trim()),
    groupHeadBg: 'none',
    groupBg: 'none',
    drawnChevron: 'none',
    groupBoxText: rgb((part('button.groupbox').textcolor || '0 70 213').trim()),
    trackTics: rgb((part('TrackBar.Tics').color || '161 161 146').trim()),
  };
  return tokens;
}

/** A Windows Classic scheme's system colours as the same token set. */
export function classicTokens(scheme) {
  const k = Object.fromEntries(
    Object.entries(scheme.colors).map(([key, v]) => [key, rgb(v)]),
  );
  return {
    face: k.ButtonFace,
    faceLight: k.ButtonHilight,
    faceShadow: k.ButtonShadow,
    faceDkShadow: k.ButtonDkShadow,
    window: k.Window,
    windowText: k.WindowText,
    highlight: k.Hilight,
    highlightText: k.HilightText,
    menu: k.Menu,
    menuText: k.MenuText,
    menuHighlight: k.MenuHilight,
    menuBorder: k.ButtonShadow,
    menuBar: k.MenuBar,
    grayText: k.GrayText,
    info: k.InfoWindow,
    infoText: k.InfoText,
    desktop: k.Background,
    captionActive: `linear-gradient(to right, ${k.ActiveTitle}, ${k.GradientActiveTitle})`,
    captionInactive: `linear-gradient(to right, ${k.InactiveTitle}, ${k.GradientInactiveTitle})`,
    captionEdgeActive: 'transparent',
    captionEdgeInactive: 'transparent',
    captionText: k.TitleText,
    captionTextInactive: k.InactiveTitleText,
    captionShadow: 'transparent',
    frameActive: k.ButtonFace,
    frameInactive: k.ButtonFace,
    frameCorner: '0px',
    frameRadius: '0px',
    taskbar: `linear-gradient(to bottom, ${k.ButtonHilight} 0, ${k.ButtonHilight} 1px, ${k.ButtonFace} 1px)`,
    tray: k.ButtonFace,
    trayBorder: k.ButtonShadow,
    trayInset: k.ButtonHilight,
    taskbtn: k.ButtonFace,
    taskbtnHover: k.ButtonFace,
    taskbtnActive: k.ButtonHilight,
    taskbtnText: k.ButtonText,
    buttonText: k.ButtonText,
    tabPage: k.ButtonFace,
    groupBorder: k.ButtonShadow,
    startText: k.ButtonText,
    startTextShadow: 'transparent',
    startHeader: `linear-gradient(to right, ${k.ActiveTitle}, ${k.GradientActiveTitle})`,
    startFooter: `linear-gradient(to right, ${k.ActiveTitle}, ${k.GradientActiveTitle})`,
    startBody: k.ButtonFace,
    startRight: k.ButtonFace,
    startRightText: k.MenuText,
    startRightBorder: k.ButtonShadow,
    startHover: k.Hilight,
    startPlacesHover: k.Hilight,
    startProgText: k.MenuText,
    startRule: k.ButtonShadow,
    startUserText: k.TitleText,
    startUserShadow: 'transparent',
    buttonBorder: k.ButtonDkShadow,
    buttonFace: k.ButtonFace,
    buttonPressed: k.ButtonFace,
    buttonFocus: k.WindowFrame,
    buttonDisabledBorder: k.ButtonDkShadow,
    buttonDisabledFace: k.ButtonFace,
    buttonDisabledText: k.GrayText,
    selectBorder: k.ButtonShadow,
    submenuBorder: k.ButtonShadow,
    submenuRule: 'transparent',
    explorerBarTop: k.ButtonFace,
    explorerBarBottom: k.ButtonFace,
    groupHeadText: k.ButtonText,
    groupHeadHot: k.HotTrackingColor,
    groupText: k.ButtonText,
    groupHeadBg: k.Window,
    groupBg: k.Window,
    drawnChevron: 'inline-block',
    groupBoxText: k.ButtonText,
    trackTics: k.ButtonShadow,
  };
}

const kebab = s => s.replace(/[A-Z]/g, ch => '-' + ch.toLowerCase());

/** The CSS custom properties for an appearance setting. */
export function themeVars(appearance) {
  const a = { ...DEFAULT_APPEARANCE, ...(appearance || {}) };
  const classic = a.style === STYLE.CLASSIC;
  const scheme = classic
    ? null
    : LUNA_SCHEMES.some(s => s.id === a.scheme)
    ? a.scheme
    : 'blue';
  const tokens = classic
    ? classicTokens(classicSchemeById(a.scheme))
    : lunaTokens(scheme);
  const font = FONT_SIZES.find(f => f.id === a.fontSize) || FONT_SIZES[0];
  const vars = {};
  for (const [k, v] of Object.entries(tokens)) vars[`--xp-${kebab(k)}`] = v;
  vars['--xp-font-ui'] = `${font.ui}px`;
  vars['--xp-font-caption'] = `${classic ? font.ui : font.caption}px`;
  vars['--xp-caption-h'] = `${
    classic ? font.classicCaption : font.lunaCaption
  }px`;
  // the frame around a window: Luna's 4px border, Classic's 4px 3D edge;
  // caption plus frame is what a window pads its content by
  vars['--xp-frame-w'] = '4px';
  vars['--xp-caption-total'] = `${(classic
    ? font.classicCaption
    : font.lunaCaption) + 4}px`;
  // dialogs wear the fixed 3px frame; Luna's caption bitmap already holds
  // its top edge, Classic's caption sits 3px down
  vars['--xp-dlg-frame-w'] = '3px';
  vars['--xp-dlg-caption-total'] = `${
    classic ? font.classicCaption + 3 : font.lunaCaption + 4
  }px`;
  if (!classic) {
    for (const st of [1, 2]) {
      const l = lunaImage(scheme, 'frameLeft-dlg', st);
      const r = lunaImage(scheme, 'frameRight-dlg', st);
      const b = lunaImage(scheme, 'frameBottom', st);
      if (l)
        vars[
          `--xp-p-window-frameleft-dlg-${st}`
        ] = `url(${l}) 0 0 0 3 fill / 0 0 0 3px stretch`;
      if (r)
        vars[
          `--xp-p-window-frameright-dlg-${st}`
        ] = `url(${r}) 0 3 0 0 fill / 0 3px 0 0 stretch`;
      if (b)
        vars[
          `--xp-p-window-framebottom-dlg-${st}`
        ] = `url(${b}) 1 5 2 5 fill / 1px 5px 2px 5px stretch`;
    }
  }
  vars['--xp-caption-font'] = classic
    ? "Tahoma, 'Noto Sans', sans-serif"
    : "'Trebuchet MS', Tahoma, sans-serif";
  if (!classic) {
    for (const entry of PARTS) {
      const [section, glyphKey] = Array.isArray(entry) ? entry : [entry, null];
      const p = lunaPart(scheme, section);
      if (!p) continue;
      const slug = partSlug(section);
      for (let s = 1; s <= p.states; s++) {
        const bi = borderImage(scheme, section, s);
        if (bi) vars[`--xp-p-${slug}-${s}`] = bi;
      }
      if (glyphKey) {
        imageStates(scheme, section, glyphKey).forEach((url, i) => {
          vars[`--xp-g-${slug}-${i + 1}`] = `url(${url})`;
        });
      }
    }
    for (const [section, key, suffix] of IMAGES) {
      const tag = suffix ? `${suffix.slice(1)}-` : '';
      imageStates(scheme, section, key, suffix).forEach((url, i) => {
        vars[`--xp-i-${partSlug(section)}-${tag}${i + 1}`] = `url(${url})`;
      });
    }
    for (const section of UNDERLAY_PARTS) {
      const p = lunaPart(scheme, section);
      if (!p || !p.name) continue;
      const slug = partSlug(section);
      for (let st = 1; st <= p.states; st++) {
        const url = lunaImage(scheme, p.name, p.states > 1 ? st : 0);
        if (url) vars[`--xp-u-${slug}-${st}`] = `url(${url})`;
      }
    }
    // edges only, so a background can show through the middle
    for (const section of NO_FILL_PARTS) {
      const p = lunaPart(scheme, section);
      if (!p) continue;
      for (let st = 1; st <= p.states; st++) {
        const bi = borderImage(scheme, section, st);
        if (bi)
          vars[`--xp-pn-${partSlug(section)}-${st}`] = bi.replace(' fill', '');
      }
    }
  }
  return { vars, style: a.style };
}

/** Paint an appearance onto the document, where every portal can see it. */
export function applyTheme(appearance, root = document.documentElement) {
  const { vars, style } = themeVars(appearance);
  // drop the previous scheme's part variables before setting the new ones
  for (const name of [...root.style]) {
    if (name.startsWith('--xp-')) root.style.removeProperty(name);
  }
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.dataset.xpStyle = style;
  // Appearance > Effects, read by the menus and the Start menu
  const fx = appearance.effects || {};
  const on = (k, d) => (k in fx ? !!fx[k] : d);
  root.dataset.xpMenuFade = !on('transition', true)
    ? 'none'
    : fx.transitionEffect === 'Scroll effect'
    ? 'scroll'
    : 'fade';
  root.dataset.xpMenuShadow = on('menuShadows', true) ? '1' : '0';
  root.dataset.xpUnderlines = on('hideUnderlines', true) ? '0' : '1';
  root.dataset.xpLargeIcons = on('largeIcons', false) ? '1' : '0';
}
