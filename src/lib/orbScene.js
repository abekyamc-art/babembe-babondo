/**
 * The scene inside the voice orb: a backdrop clip that loops behind the
 * assistant, with the assistant's green studio screen removed frame by frame so
 * the backdrop shows through. Nothing outside the orb is touched.
 */
export const ORB_BACKDROP_URL =
  "https://media.base44.com/videos/public/6ac0821625ce2ff98ccb0871/77d6a00c5_ElevenLabs_video_creatify-aurora_Medium20close-up_2026-10-03T05_41_27.mov";

// green studio screen: hue window, minimum saturation, and the green-dominance test
const KEY = { minHue: 60, maxHue: 180, minSaturation: 0.1, threshold: 1 };

function cover(vw, vh, w, h) {
  const s = Math.max(w / vw, h / vh);
  return { x: (w - vw * s) / 2, y: (h - vh * s) / 2, w: vw * s, h: vh * s };
}

function contain(vw, vh, w, h) {
  const s = Math.min(w / vw, h / vh);
  return { x: (w - vw * s) / 2, y: (h - vh * s) / 2, w: vw * s, h: vh * s };
}

/** Clears the alpha of every green pixel, softening the mixed edges. */
function stripGreen(data) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let hue = 0;
    if (delta !== 0) {
      if (max === r) hue = ((g - b) / delta) % 6;
      else if (max === g) hue = (b - r) / delta + 2;
      else hue = (r - g) / delta + 4;
      hue = Math.round(hue * 60);
      if (hue < 0) hue += 360;
    }

    const saturation = max === 0 ? 0 : delta / max;
    if (hue < KEY.minHue || hue > KEY.maxHue) continue;
    if (saturation <= KEY.minSaturation || max / 255 <= 0.15) continue;
    if (g <= r * KEY.threshold || g <= b * KEY.threshold) continue;

    const greenness = (g - Math.max(r, b)) / (g || 1);
    const alpha = Math.max(0, 1 - greenness * 4);
    data[i + 3] = alpha < 0.2 ? 0 : Math.round(alpha * 255);
  }
}

/**
 * Paints the loop: backdrop first, then the assistant keyed on top of it.
 * Returns the stop function for the frame loop.
 */
export function startOrbScene({ avatarEl, backdropEl, canvas }) {
  if (!canvas) return () => {};
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return () => {};

  // the assistant is keyed on its own surface, so the backdrop underneath is never read
  const keyed = document.createElement("canvas");
  keyed.width = canvas.width;
  keyed.height = canvas.height;
  const keyCtx = keyed.getContext("2d", { willReadFrequently: true, alpha: true });
  if (!keyCtx) return () => {};

  let raf = 0;
  let stopped = false;

  const render = () => {
    if (stopped) return;
    raf = requestAnimationFrame(render);

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const bg = backdropEl;
    if (bg && bg.readyState >= 2 && bg.videoWidth) {
      const box = cover(bg.videoWidth, bg.videoHeight, w, h);
      ctx.drawImage(bg, box.x, box.y, box.w, box.h);
    }

    const face = avatarEl;
    if (!face || face.readyState < 2 || !face.videoWidth) return;

    const box = contain(face.videoWidth, face.videoHeight, w, h);
    keyCtx.clearRect(0, 0, w, h);
    keyCtx.drawImage(face, box.x, box.y, box.w, box.h);

    const frame = keyCtx.getImageData(0, 0, w, h);
    stripGreen(frame.data);
    keyCtx.putImageData(frame, 0, 0);

    ctx.drawImage(keyed, 0, 0);
  };

  raf = requestAnimationFrame(render);

  return () => {
    stopped = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
}