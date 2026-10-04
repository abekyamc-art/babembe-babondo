/**
 * The vertical video is drawn and recorded on the phone: the take's own sound, with
 * its Ebembe lines rising one after another and their Kiswahili meaning under them.
 */

const W = 1080;
const H = 1920;
const INK = "#f5f6ff";
const MUTED = "#9ba9c6";
const ACCENT = "#6ba8ff";

/**
 * The phone is asked for an MP4 and nothing else: an iPhone records MP4 (H.264 with AAC) and
 * will not record a webm at all. A phone that can record neither is told plainly, and the take
 * is kept as its audio file instead.
 */
function pickMime() {
  const options = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4;codecs=h264,aac",
    "video/mp4",
  ];
  return options.find((type) => window.MediaRecorder?.isTypeSupported?.(type)) || "";
}

function wrap(ctx, text, maxWidth, maxLines) {
  const words = String(text || "").split(" ");
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines.slice(0, maxLines);
}

function backdrop(ctx) {
  const wash = ctx.createLinearGradient(0, 0, 0, H);
  wash.addColorStop(0, "#0b1020");
  wash.addColorStop(0.55, "#101a33");
  wash.addColorStop(1, "#0b1020");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(107, 168, 255, 0.12)";
  ctx.beginPath();
  ctx.arc(W / 2, 380, 420, 0, Math.PI * 2);
  ctx.fill();
}

function drawFrame(ctx, { title, line, total, index, progress }) {
  backdrop(ctx);

  ctx.textAlign = "center";
  ctx.fillStyle = MUTED;
  ctx.font = "600 40px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText((title || "Ebembe Rap").toUpperCase().slice(0, 34), W / 2, 300);

  const ebembe = wrap(ctx, line?.ebembe || "", W - 220, 4);
  const size = ebembe.length > 2 ? 86 : 104;
  ctx.font = `700 ${size}px system-ui, -apple-system, Segoe UI, sans-serif`;
  const wrapped = wrap(ctx, line?.ebembe || "", W - 220, 4);
  const blockHeight = wrapped.length * (size + 16);
  let y = H / 2 - blockHeight / 2 + size;

  ctx.fillStyle = INK;
  wrapped.forEach((row) => {
    ctx.fillText(row, W / 2, y);
    y += size + 16;
  });

  const swahili = wrap(ctx, line?.swahili || "", W - 260, 3);
  ctx.font = "500 54px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillStyle = MUTED;
  let sy = y + 40;
  swahili.forEach((row) => {
    ctx.fillText(row, W / 2, sy);
    sy += 72;
  });

  const barWidth = W - 240;
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.fillRect(120, H - 260, barWidth, 8);
  ctx.fillStyle = ACCENT;
  ctx.fillRect(120, H - 260, Math.max(0, Math.min(1, progress)) * barWidth, 8);

  ctx.fillStyle = MUTED;
  ctx.font = "600 40px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(`${index + 1} / ${total}`, W / 2, H - 180);
  ctx.fillStyle = ACCENT;
  ctx.font = "700 44px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText("Babembe Babondo GS", W / 2, H - 100);
}

/**
 * Records the take as a vertical video: the sound is the take itself, and the words
 * follow it. Returns the recorded file.
 */
export async function recordTake({ wavBlob, lines, title }) {
  const mime = pickMime();
  if (!window.MediaRecorder || !mime) throw new Error("video-unsupported");

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  const url = URL.createObjectURL(wavBlob);
  const audio = new Audio(url);
  audio.playsInline = true;
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  await audioCtx.resume().catch(() => {});
  const source = audioCtx.createMediaElementSource(audio);
  const dest = audioCtx.createMediaStreamDestination();
  source.connect(dest);
  source.connect(audioCtx.destination);

  const stream = canvas.captureStream(30);
  dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));

  const chunks = [];
  const recorder = new MediaRecorder(stream, { mimeType: mime });
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  const recorded = new Promise((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
  });

  await new Promise((resolve) => {
    if (audio.readyState >= 1) {
      resolve();
      return;
    }
    audio.onloadedmetadata = resolve;
  });

  const total = Math.max(1, lines.length);
  const per = audio.duration && Number.isFinite(audio.duration) ? audio.duration / total : 0;

  recorder.start(300);
  let frame = 0;
  const paint = () => {
    const index = per ? Math.min(total - 1, Math.floor(audio.currentTime / per)) : 0;
    drawFrame(ctx, {
      title,
      line: lines[index],
      index,
      total,
      progress: audio.duration ? audio.currentTime / audio.duration : 0,
    });
    if (!audio.ended) frame = requestAnimationFrame(paint);
  };

  await audio.play();
  paint();
  await new Promise((resolve) => {
    audio.onended = resolve;
  });

  cancelAnimationFrame(frame);
  recorder.stop();
  const file = await recorded;
  stream.getTracks().forEach((track) => track.stop());
  audioCtx.close().catch(() => {});
  URL.revokeObjectURL(url);

  return file;
}