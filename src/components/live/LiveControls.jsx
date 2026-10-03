import React from "react";
import {
  Gift,
  Mic,
  MicOff,
  RefreshCw,
  SlidersHorizontal,
  ZoomIn,
  Video,
  VideoOff,
  Volume2,
} from "lucide-react";

/** The room's round controls: microphone, camera, filter, sound and gifts. */
export default function LiveControls({
  isHost,
  isGuest,
  canGift,
  micOn,
  cameraOn,
  onToggleMic,
  onToggleCamera,
  onFlip,
  onFilters,
  onEffects,
  onGifts,
  onZoom,
}) {
  const items = [];

  if (isHost || isGuest) {
    items.push({
      key: "mic",
      icon: micOn ? Mic : MicOff,
      label: micOn ? "Mute" : "Unmute",
      active: !micOn,
      onClick: onToggleMic,
    });
  }
  if (isHost) {
    items.push({
      key: "camera",
      icon: cameraOn ? Video : VideoOff,
      label: "Camera",
      active: !cameraOn,
      onClick: onToggleCamera,
    });
    items.push({ key: "flip", icon: RefreshCw, label: "Flip", onClick: onFlip });
    items.push({
      key: "filter",
      icon: SlidersHorizontal,
      label: "Filter",
      onClick: onFilters,
    });
    items.push({ key: "zoom", icon: ZoomIn, label: "Zoom", onClick: onZoom });
  }
  items.push({ key: "effects", icon: Volume2, label: "Sound", onClick: onEffects });
  if (canGift) {
    items.push({ key: "gift", icon: Gift, label: "Gift", onClick: onGifts });
  }

  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={item.onClick}
          aria-label={item.label}
          className={`flex w-[3.5rem] shrink-0 flex-col items-center gap-1.5 rounded-2xl border px-1 py-2 backdrop-blur ${
            item.active ? "border-accent bg-accent/25" : "border-white/10 bg-black/45"
          }`}
        >
          <item.icon className="h-4 w-4" />
          <span className="text-[9px] font-semibold leading-none text-white/85">{item.label}</span>
        </button>
      ))}
    </div>
  );
}