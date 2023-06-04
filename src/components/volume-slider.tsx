import React, { useEffect, useState } from "react";
import * as Tone from "tone";
import { FaVolumeMute, FaVolumeUp } from "react-icons/fa";

export const VolumeSlider = () => {
  const [volume, setVolume] = useState(0.5);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setVolume(Number(localStorage.getItem("volume") || 0.5));
    setMuted(localStorage.getItem("muted") === "true");
  }, [])

  useEffect(() => {
    Tone.getDestination().mute = muted;
    Tone.getDestination().output.gain.value = volume;
    localStorage.setItem("volume", String(volume));
    localStorage.setItem("muted", String(muted));
  }, [volume, muted]);

  function handleVolumeChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = Number(event.target.value);
    setVolume(value);
    setMuted(value <= 0);
  }

  function handleMuteToggle() {
    if (muted && volume <= 0) setVolume(0.5)
    setMuted((prev) => !prev);
  }

  return (
    <div className="flex items-center">
      <button className="mr-2" onClick={handleMuteToggle} >
        {muted ? <FaVolumeMute color="red" size={21} /> : <FaVolumeUp size={21} />}
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.001"
        value={muted ? 0 : volume}
        onChange={handleVolumeChange}
        className="w-48 h-2 bg-gray-300 accent-violet-800 rounded-full cursor-pointer"
      />
    </div>
  )
}