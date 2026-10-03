/**
 * The scene inside the voice orb.
 *
 * Before the assistant is on air the backdrop clip fills the orb on its own.
 * The moment his first frame lands the orb splits into two even bubbles sitting
 * close together at one head height: the clip keeps the left bubble and his
 * keyed face takes the right, green studio screen removed. Nothing outside the
 * orb is touched.
 */
export const ORB_BACKDROP_URL =
  "https://media.base44.com/videos/public/6ac0821625ce2ff98ccb0871/77d6a00c5_ElevenLabs_video_creatify-aurora_Medium20close-up_2026-10-03T05_41_27.mov";

// green studio screen: hue window, minimum saturation, and the green-dominance test
const KEY = { minHue: 60, maxHue: 180, minSaturation: 0.1, threshold: 1 };

// the two bubbles, as a share of the orb so the canvas size may change freely
const PANE = { size: 0.452, gap: 0.105, radius: 0.242 };
const WASH = "rgba(9, 14, 28, 0.62)";
const RIM = "rgba(255, 255, 255, 0.18)";

function cover(vw, vh, w, h) {
  const s = Math.max(w / vw, h / vh);
  return { x: (w - vw * s) / 2, y: (h - vh * s) / 2, w: vw * s, h: vh * s };
}

function roundRect(c, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rad, y);
  c.arcTo(x + w, y, x + w, y + h, rad);
  c.arcTo(x + w, y + h, x, y + h, rad);
  c.arcTo(x, y + h, x, y, rad);
  c.arcTo(x, y, x + w, y, rad);
  c.closePath();
}

/** Fills a bubble edge to edge, keeping a portrait head in frame rather than its chest. */
function fillPane(c, video, x, y, size) {
  const scale = Math.max(size / video.videoWidth, size / video.videoHeight);
  const dw = video.videoWidth * scale;
  const dh = video.videoHeight * scale;
  const dx = x + (size - dw) / 2;
  const dy = y + (dh > size ? 0 : (size - dh) / 2);
  c.drawImage(video, dx, dy, dw, dh);
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

/** The two bubbles: even size, a small gap between them, one head height. */
function paneGeometry(w, h) {
  const size = Math.min(w, h) * PANE.size;
  const gap = size * PANE.gap;
  const cy = h / 2;
  return {
    size,
    radius: size * PANE.radius,
    cy,
    cx1: w / 2 - (size + gap) / 2,
    cx2: w / 2 + (size + gap) / 2,
  };
}

/**
 * Paints the loop: the clip alone until the assistant's first frame arrives,
 * then the split pair. Returns the stop function for the frame loop.
 */
export function startOrbScene({ avatarEl, backdropEl, canvas }) {
  if (!canvas) return () => {};
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return () => {};

  // the assistant is keyed on its own surface, so the clip underneath is never read
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
    const face = avatarEl;
    const hasBg = bg && bg.readyState >= 2 && bg.videoWidth;
    const hasFace = face && face.readyState >= 2 && face.videoWidth;

    // nothing covers the clip until he is actually there
    if (!hasFace) {
      if (hasBg) {
        const box = cover(bg.videoWidth, bg.videoHeight, w, h);
        ctx.drawImage(bg, box.x, box.y, box.w, box.h);
      }
      return;
    }

    const { size, radius, cy, cx1, cx2 } = paneGeometry(w, h);
    const left = { x: cx1 - size / 2, y: cy - size / 2 };
    const right = { x: cx2 - size / 2, y: cy - size / 2 };

    ctx.fillStyle = WASH;
    ctx.fillRect(0, 0, w, h);

    if (hasBg) {
      ctx.save();
      roundRect(ctx, left.x, left.y, size, size, radius);
      ctx.clip();
      fillPane(ctx, bg, left.x, left.y, size);
      ctx.restore();
    }

    keyCtx.clearRect(0, 0, w, h);
    keyCtx.save();
    roundRect(keyCtx, right.x, right.y, size, size, radius);
    keyCtx.clip();
    fillPane(keyCtx, face, right.x, right.y, size);
    keyCtx.restore();

    const frame = keyCtx.getImageData(0, 0, w, h);
    stripGreen(frame.data);
    keyCtx.putImageData(frame, 0, 0);

    ctx.drawImage(keyed, 0, 0);

    // a thin rim keeps each bubble defined against the wash
    const inset = 0.8;
    ctx.strokeStyle = RIM;
    ctx.lineWidth = 1.5;
    [left, right].forEach((pane) => {
      roundRect(ctx, pane.x + inset, pane.y + inset, size - inset * 2, size - inset * 2, radius);
      ctx.stroke();
    });
  };

  raf = requestAnimationFrame(render);

  return () => {
    stopped = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
}