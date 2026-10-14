/**
 * A recording the app holds at its own address.
 *
 * Not every piece an artist gives the app stands on YouTube: a song may be given to the app as its
 * own file, standing at an address the app can play from directly. Such an address is read here for
 * the piece it is, so the app's own player knows to play it itself rather than handing it to YouTube,
 * which only ever plays its own pieces.
 *
 * Only a plain, directly playable recording is read: an address that ends in a video file, standing
 * at a public address. Anything else — a page, a link that must be opened elsewhere — is nothing.
 */

// the shapes a directly playable recording comes in
const FILE_SHAPE = /\.(mp4|m4v|mov|webm|ogv)(\?|#|$)/i;

/**
 * The recording an address holds, or null when the address is not one. What comes back is the address
 * the player plays it from.
 */
export function videoFile(url) {
  const value = String(url || "").trim();
  if (!/^https?:\/\//i.test(value)) return null;
  if (!FILE_SHAPE.test(value)) return null;
  return { src: value };
}