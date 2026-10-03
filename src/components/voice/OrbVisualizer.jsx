import React, { useEffect, useRef } from "react";
import { ORB_BACKDROP_URL, startOrbScene } from "@/lib/orbScene";

const CANVAS = 420;

export default function OrbVisualizer({ levelRef, status, speaking, videoRef, faceOn }) {
  const faceRef = useRef(null);
  const ringRef = useRef(null);
  const backdropRef = useRef(null);
  const canvasRef = useRef(null);

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

  // the backdrop loops silently the whole time the screen is open
  useEffect(() => {
    const el = backdropRef.current;
    if (!el) return undefined;
    el.muted = true;
    el.play().catch(() => {});
    return undefined;
  }, []);

  // while the face is on air, the backdrop and the keyed face are painted together
  useEffect(() => {
    if (!faceOn) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    return startOrbScene({
      avatarEl: videoRef?.current,
      backdropEl: backdropRef.current,
      canvas,
    });
  }, [faceOn, videoRef]);

  return (
    <div className={`orb-shell${status === "connecting" ? " is-connecting" : ""}`}>
      <div className="orb-halo" />
      <div className="orb-ring" ref={ringRef} />
      <div className="orb-face" ref={faceRef}>
        <video
          ref={backdropRef}
          src={ORB_BACKDROP_URL}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {videoRef ? (
          // the raw avatar stream is read by the painter, and stays the element the
          // assistant's own voice comes out of — so it is hidden, never muted
          <video
            ref={videoRef}
            autoPlay
            playsInline
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
          />
        ) : null}
        <canvas
          ref={canvasRef}
          width={CANVAS}
          height={CANVAS}
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-700 ${
            faceOn ? "opacity-100" : "opacity-0"
          }`}
        />
        {faceOn ? null : <div className="orb-sheen" />}
      </div>
    </div>
  );
}