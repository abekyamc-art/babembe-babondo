import React from "react";
import { ZoomIn } from "lucide-react";
import { Slider } from "@/components/ui/slider";

/** The host's framing: it pulls the phone's own camera in and out, so the room sees the same picture. */
export default function ZoomControl({
  open,
  canZoom,
  level,
  range,
  onChange,
  onCommit,
  onClose,
}) {
  if (!open) return null;

  const min = range?.min ?? 1;
  const max = range?.max ?? 1;
  const step = range?.step || 0.1;
  const value = typeof level === "number" ? level : min;

  const reset = () => {
    onChange(min);
    onCommit(min);
  };

  return (
    <div className="rounded-2xl border border-white/12 bg-black/60 px-3 py-2.5 backdrop-blur">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65">
          <ZoomIn className="h-3.5 w-3.5 text-accent" />
          Zoom
        </span>
        <span className="flex items-center gap-3">
          {canZoom ? (
            <span className="text-[11px] font-semibold text-white/70">{value.toFixed(1)}×</span>
          ) : null}
          {canZoom ? (
            <button
              type="button"
              onClick={reset}
              className="text-[11px] font-semibold text-accent"
            >
              Normal
            </button>
          ) : null}
          <button type="button" onClick={onClose} className="text-[11px] font-semibold text-white/60">
            Done
          </button>
        </span>
      </div>

      {canZoom ? (
        <Slider
          value={[value]}
          min={min}
          max={max}
          step={step}
          onValueChange={([next]) => onChange(next)}
          onValueCommit={([next]) => onCommit(next)}
          aria-label="Camera zoom"
          className="flex-1 [&>span:first-child]:bg-white/25 [&>span:first-child>span]:bg-accent [&>span:last-child]:border-accent [&>span:last-child]:bg-white"
        />
      ) : (
        <p className="text-[12px] leading-snug text-white/65">
          This phone's camera can't zoom — the picture stays as it is.
        </p>
      )}
    </div>
  );
}