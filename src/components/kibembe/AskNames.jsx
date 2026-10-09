import React from "react";

/**
 * The several different people or artists a search found under names that look alike, standing before
 * the person as the names to choose between. A tap names the one they mean, and that name is their
 * own turn — so the answer that follows is about the one they chose and names them back.
 */
export default function AskNames({ names, onPick }) {
  if (!onPick || !Array.isArray(names) || names.length < 2) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {names.map((one, index) => (
        <button
          key={`${one?.name || index}`}
          type="button"
          onClick={() => onPick(String(one?.name || ""))}
          className="max-w-full truncate rounded-full border border-accent/50 bg-accent/10 px-2.5 py-1 text-left font-body text-[11.5px] font-semibold leading-tight text-accent transition hover:bg-accent/20 active:scale-95"
        >
          {one?.name}
        </button>
      ))}
    </div>
  );
}