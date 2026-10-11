const OBJECTS = ["ball", "flower", "bucket", "bird", "basket", "flag", "pot", "lantern", "book", "fish", "kite", "cup"];
/** Exact bounds shared by the drawn objects and touch detection; no vision guesses. */
export default function photoDifferences(level) {
  const target = level.differences.filter((place) => !place.extra).length;
  return Array.from({ length: target + 2 }, (_, i) => {
    const slot = (i + level.id) % 12;
    const object = OBJECTS[(i + level.id) % OBJECTS.length];
    return {
      id: `${level.scene}-clear-${i + 1}`,
      x: 0.055 + (slot % 4) * 0.25,
      y: 0.065 + Math.floor(slot / 4) * 0.31,
      w: 0.14,
      h: 0.24,
      object,
      label: `The ${object} changed colour`,
      extra: i >= target,
    };
  });
}