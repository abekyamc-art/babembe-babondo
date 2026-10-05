/**
 * The sound of a spoken turn, put into the shape the app's own ears read: 16-bit PCM at 16 kHz,
 * single channel, wrapped in a WAV header. The phone records at its own rate and in its own
 * format, so a turn is resampled — every output sample the mean of the sound it spans, never one
 * point of it, since reading single points folds everything above the new rate back into the words.
 * The capture is lifted before it is sent, so ordinary speech at arm's length arrives as loud as
 * speech close to the phone.
 */

const IN_RATE = 16000;
const MIC_GAIN = 1.6;

export { IN_RATE };

/** The phone's own rate down to the rate the ears listen at. */
export function resample(input, fromRate, toRate = IN_RATE) {
  if (!input.length || fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const len = Math.floor(input.length / ratio);
  if (len < 1) return new Float32Array(0);
  const span = Math.max(1, Math.round(ratio));
  const out = new Float32Array(len);
  for (let i = 0; i < len; i += 1) {
    const at = Math.min(Math.round(i * ratio), input.length - 1);
    const end = Math.min(at + span, input.length);
    let sum = 0;
    for (let pos = at; pos < end; pos += 1) sum += input[pos];
    out[i] = sum / (end - at);
  }
  return out;
}

/** The capture, lifted: quiet speech comes up, and tanh rounds the loudest peaks instead of clipping. */
export function lift(samples) {
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) out[i] = Math.tanh(samples[i] * MIC_GAIN);
  return out;
}

/** The turn as 16-bit samples. */
export function floatToPcm16(samples) {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return out;
}

/** The turn as the WAV file the ears open. */
export function wavBytes(samples, rate = IN_RATE) {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const tag = (at, text) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(at + i, text.charCodeAt(i));
  };
  tag(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  tag(8, "WAVE");
  tag(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  tag(36, "data");
  view.setUint32(40, samples.length * 2, true);
  const pcm = new DataView(bytes.buffer, 44);
  for (let i = 0; i < samples.length; i += 1) pcm.setInt16(i * 2, samples[i], true);
  return bytes;
}

/** Bytes as the text the request carries them in, in pieces so a long turn never overflows. */
export function bytesToBase64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}