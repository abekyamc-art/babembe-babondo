import React, { useEffect, useRef } from "react";

export default function OrbVisualizer({ levelRef, status, speaking }) {
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
        <div className="orb-sheen" />
      </div>
    </div>
  );
}