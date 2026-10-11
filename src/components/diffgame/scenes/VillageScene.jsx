import React from "react";
import { INK, Sun, Cloud, Tree, Flower, Pot, Bucket, Person, Chicken } from "./parts";

/**
 * The village home: the morning sun, a hut with its door and window, the family's tree, and the cooking
 * fire beside the house. The same drawing stands in both pictures — only what `changed` names is taken
 * away or turned, so the two copies are the same picture and nothing else.
 */
export default function VillageScene({ changed, uid }) {
  return (
    <svg
      viewBox="0 0 1000 560"
      className="dg-art"
      role="img"
      aria-label="A village home with a hut, a tree and a cooking fire"
    >
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bfe6ff" />
          <stop offset="100%" stopColor="#f2fbff" />
        </linearGradient>
      </defs>
      <rect width="1000" height="560" fill={`url(#${uid}-sky)`} />
      <Sun x={140} y={92} r={46} face={!changed.has("sun-face")} />
      <Cloud x={330} y={64} s={0.58} />
      {!changed.has("cloud") ? <Cloud x={800} y={74} s={0.78} /> : null}

      <path
        d="M0 452 Q 240 414 520 444 Q 760 468 1000 424 L1000 560 L0 560 Z"
        fill="#9ed36a"
        stroke="#7cb350"
        strokeWidth="5"
      />
      <path d="M0 502 Q 300 486 620 512 Q 820 526 1000 508 L1000 560 L0 560 Z" fill="#8ec55c" />

      <Tree x={855} y={430} s={1} fruit={!changed.has("tree-fruit")} />

      <polygon points="300,262 495,124 690,262" fill="#b5623d" stroke={INK} strokeWidth="7" strokeLinejoin="round" />
      <rect x="332" y="258" width="326" height="176" rx="8" fill="#eddcbe" stroke={INK} strokeWidth="7" />
      <rect x="352" y="292" width="76" height="66" rx="6" fill="#a9def7" stroke={INK} strokeWidth="6" />
      <path d="M390 292 V358 M352 325 H428" stroke={INK} strokeWidth="6" />
      <rect x="342" y="356" width="96" height="14" rx="7" fill="#c9a97a" stroke={INK} strokeWidth="5" />
      <rect
        x="470"
        y="330"
        width="86"
        height="104"
        rx="8"
        fill={changed.has("door-color") ? "#2f6fb0" : "#8b5a2b"}
        stroke={INK}
        strokeWidth="7"
      />
      <circle cx="540" cy="384" r="7" fill="#ffd23f" stroke={INK} strokeWidth="4" />

      <g strokeLinecap="round">
        <path d="M150 470 L252 452" stroke="#8b5a2b" strokeWidth="13" />
        <path d="M158 484 L246 488" stroke="#a9723f" strokeWidth="13" />
      </g>
      <Pot x={205} y={415} steam={!changed.has("pot-steam")} />

      <Flower x={72} y={505} s={0.9} petal={changed.has("flower") ? "#ffd23f" : "#e0453f"} />
      <Chicken x={318} y={482} s={0.9} />
      <Person x={620} y={470} s={0.75} shirt="#2f6fb0" hat={changed.has("hat")} />
      {!changed.has("bucket") ? <Bucket x={790} y={500} s={0.9} /> : null}
    </svg>
  );
}