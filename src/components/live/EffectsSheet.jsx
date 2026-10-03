import React from "react";
import { EFFECTS } from "@/lib/soundEffects";
import LiveSheet from "@/components/live/LiveSheet";

/** Sound effects anyone in the room can drop in. */
export default function EffectsSheet({ open, onPick, onClose }) {
  return (
    <LiveSheet open={open} title="Sound effects" onClose={onClose}>
      <div className="grid grid-cols-3 gap-2">
        {EFFECTS.map((effect) => (
          <button
            key={effect.id}
            type="button"
            onClick={() => onPick(effect)}
            className="rounded-2xl border border-white/10 bg-white/5 px-2 py-3 text-[11px] font-semibold"
          >
            <span className="mb-1 block text-[20px]">{effect.emoji}</span>
            {effect.name}
          </button>
        ))}
      </div>
      <p className="mt-3 text-center text-[11px] text-white/50">Everyone in the room hears it.</p>
    </LiveSheet>
  );
}