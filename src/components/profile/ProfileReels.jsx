import React from "react";

export default function ProfileReels({ reels, onOpen }) {
  if (!reels.length) {
    return (
      <p className="py-10 text-center text-[13px] text-muted-foreground">No reels here yet.</p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1 px-3 pb-10">
      {reels.map((reel) => (
        <button
          key={reel.id}
          type="button"
          onClick={() => onOpen(reel)}
          className="relative aspect-[9/16] overflow-hidden rounded-lg bg-secondary"
        >
          <video
            src={reel.video_url}
            muted
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />
        </button>
      ))}
    </div>
  );
}