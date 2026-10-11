import React from "react";
import PhotoObject from "@/components/diffgame/scenes/PhotoObject";

/** Draw each difference inside the exact same bounds used for tapping and rings. */
export default function PhotoChanges({ differences, changed }) {
  return (
    <svg viewBox="0 0 1000 560" className="dg-art" aria-hidden="true" pointerEvents="none">
      {differences.map((place) => (
        <svg key={place.id} x={place.x * 1000} y={place.y * 560}
          width={place.w * 1000} height={place.h * 560}
          viewBox="0 0 100 100" preserveAspectRatio="none" overflow="visible">
          <PhotoObject object={place.object} changed={changed.has(place.id)} />
        </svg>
      ))}
    </svg>
  );
}