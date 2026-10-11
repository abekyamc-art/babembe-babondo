/** The target stays unchanged when two spare differences are added; any visible difference counts. */

/** The places a level asks for: finding every one of them passes it. */
export const requiredPlaces = (level) => (level?.differences || []).filter((place) => !place.extra);

/** The places beyond the number asked for: they may be found, or left standing. */
export const extraPlaces = (level) => (level?.differences || []).filter((place) => place.extra);

/** How many places must be found before the level is passed. */
export const requiredCount = (level) => requiredPlaces(level).length;

/** How many extra places stand in the picture, beyond what the level asks for. */
export const extraCount = (level) => extraPlaces(level).length;