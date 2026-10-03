import React from "react";
import { FILTERS } from "@/lib/videoFilters";
import LiveSheet from "@/components/live/LiveSheet";

/** The host's camera filter: switching it changes what everyone watching sees. */
export default function FilterSheet({ open, value, onPick, onClose }) {
  return (
    <LiveSheet open={open} title="Camera filter" onClose={onClose}>
      <div className="grid grid-cols-3 gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => onPick(filter.id)}
            className={`rounded-2xl border px-2 py-3 text-[12px] font-semibold ${
              value === filter.id ? "border-accent bg-accent/20" : "border-white/10 bg-white/5"
            }`}
          >
            {filter.name}
          </button>
        ))}
      </div>
      <p className="mt-3 text-center text-[11px] text-white/50">Everyone watching sees it too.</p>
    </LiveSheet>
  );
}