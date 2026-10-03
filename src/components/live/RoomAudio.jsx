import React, { useCallback, useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";

/**
 * The room's sound. Every other phone's voice gets its own player — the picture
 * player stays silent so the two can never fight. Phones refuse to start sound
 * on their own, so one tap starts them all and the tap is offered again whenever
 * the sound stops.
 */
export default function RoomAudio({ streams }) {
  const [sounding, setSounding] = useState(false);
  const players = useRef(new Map());
  const entries = Object.entries(streams || {});
  const key = entries
    .map(([email]) => email)
    .sort()
    .join("|");

  const play = useCallback(async () => {
    const nodes = [...players.current.values()].filter(Boolean);
    if (!nodes.length) return;
    const played = await Promise.all(
      nodes.map((node) =>
        Promise.resolve(node.play())
          .then(() => !node.paused)
          .catch(() => false)
      )
    );
    setSounding(played.every(Boolean));
  }, []);

  // a voice that joins later starts on its own once the room has been unlocked
  useEffect(() => {
    play();
  }, [key, play]);

  return (
    <>
      {entries.map(([email, stream]) => (
        <audio
          key={email}
          ref={(node) => {
            if (node) {
              node.srcObject = stream;
              players.current.set(email, node);
            } else {
              players.current.delete(email);
            }
          }}
          autoPlay
          playsInline
          onPause={() => setSounding(false)}
          className="hidden"
        />
      ))}

      {entries.length > 0 && !sounding ? (
        <button
          type="button"
          onClick={play}
          className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-white/20 bg-black/65 px-4 py-2.5 text-[12px] font-semibold text-white backdrop-blur"
        >
          <Volume2 className="h-4 w-4 text-accent" />
          Tap for sound
        </button>
      ) : null}
    </>
  );
}