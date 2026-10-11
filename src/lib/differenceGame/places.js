/**
 * GLOIRE AI — FIND THE DIFFERENCES: the places of a level, told apart by what they are for.
 *
 * A level asks for a number of differences, and the picture it stands on may hold a few more than that
 * number. The places the level asks for must be found: finding every one of them passes the level. A place
 * beyond the number asked for is extra — it is a real difference in the picture, so a touch on it finds it
 * and it earns its points like any other, but the player may leave it standing and still pass the level.
 *
 * So the number a level was made with is never changed by the extras that stand beside it: five places
 * asked for stay five, however many extras a picture holds.
 */

/** The places a level asks for: finding every one of them passes it. */
export const requiredPlaces = (level) => (level?.differences || []).filter((place) => !place.extra);

/** The places beyond the number asked for: they may be found, or left standing. */
export const extraPlaces = (level) => (level?.differences || []).filter((place) => place.extra);

/** How many places must be found before the level is passed. */
export const requiredCount = (level) => requiredPlaces(level).length;

/** How many extra places stand in the picture, beyond what the level asks for. */
export const extraCount = (level) => extraPlaces(level).length;