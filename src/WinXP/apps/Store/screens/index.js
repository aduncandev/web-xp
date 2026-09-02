// Screen name (as kept on the navigation stack) to the component that draws it.
import Splash from './Splash';
import Welcome from './Welcome';
import MainMenu from './MainMenu';
import {
  CatCards,
  CatPick,
  SearchScreen,
  ShelfHub,
  TitleList,
} from './Catalog';
import TitlePage from './TitlePage';
import {
  Complete,
  Confirm,
  DelConfirm,
  DelDone,
  Downloading,
} from './Purchase';
import { AccountActivity, Downloads, Points, Settings } from './Account';
import { Help, Info, News } from './Info';

export const SCREENS = {
  splash: Splash,
  welcome: Welcome,
  main: MainMenu,
  shelfhub: ShelfHub,
  catpick: CatPick,
  catcards: CatCards,
  search: SearchScreen,
  list: TitleList,
  title: TitlePage,
  confirm: Confirm,
  downloading: Downloading,
  complete: Complete,
  delconfirm: DelConfirm,
  deldone: DelDone,
  downloads: Downloads,
  points: Points,
  account: AccountActivity,
  settings: Settings,
  help: Help,
  news: News,
  info: Info,
};
