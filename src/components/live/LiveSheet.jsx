import React from "react";
import { X } from "lucide-react";

/** A small bottom sheet for the live room's pickers. */
export default function LiveSheet({ open, title, onClose, children }) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-40">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-white/10 bg-black/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 text-white shadow-[0_-18px_48px_rgba(0,0,0,0.5)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[14px] font-semibold">{title}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}