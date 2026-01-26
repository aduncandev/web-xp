import React, { createContext, useState, useEffect, useContext } from 'react';

const VolumeContext = createContext();

export const useVolume = () => useContext(VolumeContext);

export const VolumeProvider = ({ children }) => {
    // Initialize volume from localStorage, defaulting to 50
    const [volume, setVolume] = useState(() => {
        const savedVolume = localStorage.getItem('siteVolume');
        return savedVolume !== null ? JSON.parse(savedVolume) : 50;
    });

    // Initialize mute state from localStorage, defaulting to false
    const [isMuted, setIsMuted] = useState(() => {
        const savedMute = localStorage.getItem('siteMuted');
        return savedMute !== null ? JSON.parse(savedMute) : false;
    });

    // Save volume to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('siteVolume', JSON.stringify(volume));
    }, [volume]);

    // Save mute state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('siteMuted', JSON.stringify(isMuted));
    }, [isMuted]);

    // --- THIS IS THE MISSING FUNCTION ---
    /**
     * A helper function to apply volume/mute settings to an HTMLAudioElement.
     * @param {HTMLAudioElement} audio - The audio element to configure.
     */
    const applyVolume = (audio) => {
        if (audio) {
            audio.volume = volume / 100; // HTML audio volume is 0.0 to 1.0
            audio.muted = isMuted;
        }
    };
    // ------------------------------------

    return (
        // --- AND IT NEEDS TO BE ADDED TO THE VALUE HERE ---
        <VolumeContext.Provider value={{ volume, setVolume, isMuted, setIsMuted, applyVolume }}>
            {children}
        </VolumeContext.Provider>
    );
};

