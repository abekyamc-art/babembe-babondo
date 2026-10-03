import React, { useEffect, useRef } from "react";

export default function OrbVisualizer({ levelRef, status, speaking, videoRef, faceOn }) {
  const faceRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    let raf = 0;
    let smooth = 0;

    const tick = () => {
      const raw = levelRef?.current || 0;
      smooth += (raw - smooth) * 0.18;
      const energy = Math.min(1, smooth + (speaking ? 0.35 : 0));

      if (faceRef.current) {
        faceRef.current.style.transform = `scale(${1 + energy * 0.065})`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `scale(${1 + energy * 0.16})`;
        ringRef.current.style.opacity = String(0.2 + energy * 0.55);
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [levelRef, speaking]);

  return (
    <div className={`orb-shell${status === "connecting" ? " is-connecting" : ""}`}>
      <div className="orb-halo" />
      <div className="orb-ring" ref={ringRef} />
      <div className="orb-face" ref={faceRef}>
        {videoRef ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            aria-hidden="true"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
              faceOn ? "opacity-100" : "opacity-0"
            }`}
          />
        ) : null}
        {faceOn ? null : <div className="orb-sheen" />}
      </div>
    </div>
  );
}