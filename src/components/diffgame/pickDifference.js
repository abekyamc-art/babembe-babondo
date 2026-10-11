/** Match a finger to one unfound object; overlapping found objects cannot block it. */
export default function pickDifference(differences, found, x, y, rect) {
  const reach = 22;
  const hits = differences.map((d) => {
    const dx = Math.max(d.x - x, 0, x - d.x - d.w) * rect.width;
    const dy = Math.max(d.y - y, 0, y - d.y - d.h) * rect.height;
    const outside = Math.hypot(dx, dy);
    const center = Math.hypot((x - d.x - d.w / 2) * rect.width,
      (y - d.y - d.h / 2) * rect.height);
    return { d, outside, center };
  }).filter((hit) => hit.outside <= reach);
  const available = hits.filter((hit) => !found.includes(hit.d.id));
  available.sort((a, b) => a.outside - b.outside || a.center - b.center);
  return { difference: available[0]?.d, alreadyFound: hits.some((hit) => found.includes(hit.d.id)) };
}