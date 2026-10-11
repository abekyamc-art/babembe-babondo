import React from "react";
import { INK, Sun, Cloud, Tree, Person, Basket, Basin, Bucket, Chicken, Cloth, RiverBand, Birds } from "./parts";

/**
 * Washing day at the river: the cloths drying on the line between its two poles, the tree at the bank,
 * the basin on the flat stones and the broad river in front. One drawing, drawn twice — only what
 * `changed` names is taken away or turned, so the two copies are the same picture in everything else.
 */
export default function RiverWashScene({ changed, uid }) {
  return (
    <svg
      viewBox="0 0 1000 560"
      className="dg-art"
      role="img"
      aria-label="Women washing clothes at the river, with cloths drying on a line"
    >
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bfe6ff" />
          <stop offset="100%" stopColor="#f2fbff" />
        </linearGradient>
      </defs>
      <rect width="1000" height="560" fill={`url(#${uid}-sky)`} />
      <Sun x={884} y={84} r={38} />
      <Cloud x={250} y={66} s={0.6} />
      {!changed.has("cloud") ? <Cloud x={640} y={54} s={0.5} /> : null}
      {changed.has("birds") ? <Birds x={480} y={150} s={1.1} /> : null}

      <rect y="300" width="1000" height="72" fill="#9ed36a" />
      <Tree x={130} y={320} s={0.9} fruit={!changed.has("fruit")} />
      <RiverBand y={370} height={120} />

      <rect x="544" y="220" width="15" height="196" rx="7" fill="#8b5a2b" stroke={INK} strokeWidth="5" />
      <rect x="884" y="220" width="15" height="196" rx="7" fill="#8b5a2b" stroke={INK} strokeWidth="5" />
      <path d="M551 228 Q 720 258 891 228" fill="none" stroke="#7d5a34" strokeWidth="7" />
      <Cloth x={640} y={252} color="#fdf6ec" />
      <Cloth x={730} y={258} color={changed.has("cloth") ? "#3b82c4" : "#f0a020"} />
      <Cloth x={820} y={250} color="#8ec55c" />

      <Person x={380} y={452} s={0.85} shirt={changed.has("shirt") ? "#2f9e44" : "#e0453f"} trouser="#2f4a7d" />
      {!changed.has("basket") ? <Basket x={200} y={470} s={0.95} /> : null}
      <Basin x={640} y={472} s={1} fill={changed.has("basin") ? "#e0453f" : "#cfd8e3"} />
      {changed.has("bucket") ? <Bucket x={800} y={490} s={0.9} /> : null}
      {changed.has("hen") ? <Chicken x={920} y={512} s={0.9} /> : null}
    </svg>
  );
}