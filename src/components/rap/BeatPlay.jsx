import React, { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

/** Plays a beat the studio is holding — its own bytes, or bytes it fetches when tapped. */
export default function BeatPlay({ bytes, load, label = "Sikiliza beat", busy }) {
  const audioRef = useRef(null);
  const urlRef = useRef("");
  const [playing, setPlaying] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    []
  );

  const toggle = async () => {
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
      return;
    }

    let data = bytes;
    if (!data && load) {
      setOpening(true);
      try {
        data = await load();
      } catch (err) {
        data = null;
      }
      setOpening(false);
    }

    const audio = audioRef.current;
    if (!data || !audio) return;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = URL.createObjectURL(new Blob([data], { type: "audio/wav" }));
    audio.src = urlRef.current;
    audio.play().catch(() => setPlaying(false));
    setPlaying(true);
  };

  return (
    <>
      <button
        type="button"
        className="rap-tool"
        aria-label={playing ? "Simamisha" : label}
        aria-pressed={playing}
        disabled={!!busy || opening}
        onClick={toggle}
      >
        {playing ? <Pause /> : <Play />}
      </button>
      <audio ref={audioRef} className="rap-hidden" onEnded={() => setPlaying(false)} />
    </>
  );
}