import React, { useEffect, useState } from "react";
import * as Tone from "tone";
import { FaVolumeMute, FaVolumeUp } from "react-icons/fa";

export const VolumeSlider = () => {
  const [volume, setVolume] = useState(0.5);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setVolume(Number(localStorage.getItem("volume") || 0.5));
    setMuted(Boolean(localStorage.getItem("muted") || false));
  }, [])

  useEffect(() => {
    Tone.getDestination().mute = muted;
    Tone.getDestination().output.gain.value = volume;
    localStorage.setItem("volume", String(volume));
    localStorage.setItem("muted", String(muted));
  }, [volume, muted]);

  function handleVolumeChange(event: React.ChangeEvent<HTMLInputElement>) {
    setVolume(Number(event.target.value));
    setMuted(false);
  }

  function handleMuteToggle() {
    setMuted(!muted);
  }

  return (
    <div className="flex items-center">
      <button className="mr-2" onClick={handleMuteToggle} >
        {muted ? <FaVolumeMute color="red" /> : <FaVolumeUp />}
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.001"
        disabled={muted}
        value={volume}
        onChange={handleVolumeChange}
        className="w-48 h-2 bg-gray-300 rounded-full appearance-none"
      />
    </div>
  )
}