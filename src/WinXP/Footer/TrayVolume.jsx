import React, { useEffect, useRef, useState } from 'react';
import XPTooltip from 'components/XPTooltip';
import VolumeSlider from '../../components/VolumeSlider';
import { useVolume } from '../../context/VolumeContext';
import sound from 'assets/windowsIcons/690(16x16).png';

/**
 * The tray's speaker: a click drops the slider, a double-click opens the
 * full mixer like the real tray. The slider closes on any press outside
 * it and the icon.
 */
export default function TrayVolume({ onOpenMixer }) {
  const [open, setOpen] = useState(false);
  const { volume, setVolume, isMuted, setIsMuted } = useVolume();
  const sliderRef = useRef(null);
  const iconRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPress = e => {
      const inside = ref => ref.current && ref.current.contains(e.target);
      if (!inside(sliderRef) && !inside(iconRef)) setOpen(false);
    };
    document.addEventListener('mousedown', onPress);
    return () => document.removeEventListener('mousedown', onPress);
  }, [open]);

  return (
    <>
      <XPTooltip text="Volume">
        <img
          ref={iconRef}
          className="footer__icon"
          src={sound}
          alt="Volume"
          onClick={() => setOpen(v => !v)}
          onDoubleClick={() => {
            setOpen(false);
            onOpenMixer();
          }}
          style={{ cursor: 'pointer' }}
        />
      </XPTooltip>
      <div
        ref={sliderRef}
        // right-clicks on the slider are its own, not the taskbar's
        onContextMenu={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {open && (
          <VolumeSlider
            volume={volume}
            onVolumeChange={setVolume}
            isMuted={isMuted}
            onMuteChange={setIsMuted}
          />
        )}
      </div>
    </>
  );
}
