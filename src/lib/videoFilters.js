/**
 * Camera filters for a live room. The host picks one and it is written on the
 * room, so every phone watching shows the same picture without the stream
 * having to be re-encoded on the way out.
 */
export const FILTERS = [
  { id: "none", name: "None", css: "none" },
  { id: "warm", name: "Warm", css: "saturate(1.25) contrast(1.06) sepia(0.14)" },
  { id: "cool", name: "Cool", css: "saturate(1.12) brightness(1.04) hue-rotate(-14deg)" },
  { id: "mono", name: "Mono", css: "grayscale(1) contrast(1.12)" },
  { id: "vivid", name: "Vivid", css: "saturate(1.7) contrast(1.16)" },
  { id: "night", name: "Night", css: "brightness(0.82) contrast(1.22) saturate(0.85)" },
];

export function filterCss(id) {
  return FILTERS.find((filter) => filter.id === id)?.css || "none";
}