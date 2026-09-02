// The skin's button bitmaps, grouped by control: up / hover / down (and the
// latched states of the sticky buttons). All from WMPLOC.DLL.
import playUp from './skin/play_btn_up.png';
import playHover from './skin/play_btn_hover.png';
import playDown from './skin/play_btn_down.png';
import pauseUp from './skin/play_pause_btn_up.png';
import pauseHover from './skin/play_pause_btn_hover.png';
import pauseDown from './skin/play_pause_btn_down.png';
import stopUp from './skin/stop_btn_up.png';
import stopHover from './skin/stop_btn_hover.png';
import stopDown from './skin/stop_btn_down.png';
import rewUp from './skin/rewind_btn_up.png';
import rewHover from './skin/rewind_btn_hover.png';
import rewDown from './skin/rewind_btn_down.png';
import ffUp from './skin/fastforward_btn_up.png';
import ffHover from './skin/fastforward_btn_hover.png';
import ffDown from './skin/fastforward_btn_down.png';
import soundUp from './skin/sound_btn_up.png';
import soundHover from './skin/sound_btn_hover.png';
import soundDown from './skin/sound_btn_down.png';
import seekBkg from './skin/seek_sldr_bkg.png';
import seekFore from './skin/seek_sldr_fore.png';
import seekThumbUp from './skin/seek_thumb_up.png';
import volBkg from './skin/vol_sldr_bkg.png';
import volFore from './skin/vol_sldr_fore.png';
import volThumbUp from './skin/vol_thumb_up.png';
import skinUp from './skin/skinmode_btn_up.png';
import skinHover from './skin/skinmode_btn_hover.png';
import skinDown from './skin/skinmode_btn_down.png';
import loopUp from './skin/loopbtnup.png';
import loopHover from './skin/loopbtnhover.png';
import loopAllOn from './skin/loopbtndown.png';
import loopAllOnHover from './skin/loopbtndownhover.png';
import loopOneOn from './skin/looponebtndown.png';
import loopOneOnHover from './skin/looponebtndownhover.png';
import shuffleUp from './skin/appshufflebtnup.png';
import shuffleHover from './skin/appshufflebtnhover.png';
import shuffleOn from './skin/appshufflebtndown.png';
import shuffleOnHover from './skin/appshufflebtndownhover.png';
import eqUp from './skin/appeqbtnup.png';
import eqHover from './skin/appeqbtnhover.png';
import eqOn from './skin/appeqbtndown.png';
import eqOnHover from './skin/appeqbtndownhover.png';
import plUp from './skin/appplaylistbtnup.png';
import plHover from './skin/appplaylistbtnhover.png';
import plOn from './skin/appplaylistbtndown.png';
import plOnHover from './skin/appplaylistbtndownhover.png';
import autoUp from './skin/appautohidebtnup.png';
import autoHover from './skin/appautohidebtnhover.png';
import autoOn from './skin/appautohidebtndown.png';
import autoOnHover from './skin/appautohidebtndownhover.png';
import vizSwitchUp from './skin/vizpulldown_up.png';
import vizSwitchHover from './skin/vizpulldown_hover.png';
import vizPrevUp from './skin/vizprev_up.png';
import vizPrevHover from './skin/vizprev_hover.png';
import vizPrevDown from './skin/vizprev_down.png';
import vizNextUp from './skin/viznext_up.png';
import vizNextHover from './skin/viznext_hover.png';
import vizNextDown from './skin/viznext_down.png';
import fullUp from './skin/fullscreen_up.png';
import fullHover from './skin/fullscreen_hover.png';
import fullDown from './skin/fullscreen_down.png';
import statePlaying from './skin/state_playing.gif';
import statePaused from './skin/state_paused.gif';
import stateStopped from './skin/state_stopped.gif';

export const SKIN = {
  play: { up: playUp, hover: playHover, down: playDown },
  pause: { up: pauseUp, hover: pauseHover, down: pauseDown },
  stop: { up: stopUp, hover: stopHover, down: stopDown },
  rewind: { up: rewUp, hover: rewHover, down: rewDown },
  fastForward: { up: ffUp, hover: ffHover, down: ffDown },
  sound: { up: soundUp, hover: soundHover, down: soundDown },
  seek: { bkg: seekBkg, fore: seekFore, thumb: seekThumbUp },
  volume: { bkg: volBkg, fore: volFore, thumb: volThumbUp },
  skinMode: { up: skinUp, hover: skinHover, down: skinDown },
  loop: {
    up: loopUp,
    hover: loopHover,
    allOn: loopAllOn,
    allOnHover: loopAllOnHover,
    oneOn: loopOneOn,
    oneOnHover: loopOneOnHover,
  },
  shuffle: {
    up: shuffleUp,
    hover: shuffleHover,
    on: shuffleOn,
    onHover: shuffleOnHover,
  },
  equalizer: { up: eqUp, hover: eqHover, on: eqOn, onHover: eqOnHover },
  playlist: { up: plUp, hover: plHover, on: plOn, onHover: plOnHover },
  menuBar: { up: autoUp, hover: autoHover, on: autoOn, onHover: autoOnHover },
  vizSwitch: { up: vizSwitchUp, hover: vizSwitchHover },
  vizPrev: { up: vizPrevUp, hover: vizPrevHover, down: vizPrevDown },
  vizNext: { up: vizNextUp, hover: vizNextHover, down: vizNextDown },
  fullScreen: { up: fullUp, hover: fullHover, down: fullDown },
  state: { playing: statePlaying, paused: statePaused, stopped: stateStopped },
};
