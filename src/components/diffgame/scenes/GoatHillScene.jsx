import React from "react";
import { Sun, Cloud, Tree, Person, Goat, Fence, Flower, Birds } from "./parts";

/**
 * The goat herders: the small herd on the green hillside, the herder with his staff beside them, the
 * thorn fence and the trees behind. One drawing, drawn twice — only what `changed` names is taken away
 * or turned, so the two copies are the same picture in everything else.
 */
export default function GoatHillScene({ changed, uid }) {
  return (
    <svg
      viewBox="0 0 1000 560"
      className="dg-art"
      role="img"
      aria-label="Goat herders with their goats on a green hillside"
    >
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#cdeaff" />
          <stop offset="100%" stopColor="#f4fbff" />
        </linearGradient>
      </defs>
      <rect width="1000" height="560" fill={`url(#${uid}-sky)`} />
      <Sun x={140} y={90} r={42} />
      <Cloud x={330} y={62} s={0.55} />
      {!changed.has("cloud") ? <Cloud x={760} y={70} s={0.68} /> : null}
      {changed.has("birds") ? <Birds x={560} y={150} s={1.2} /> : null}

      <path d="M0 340 Q 260 286 540 330 Q 780 366 1000 312 L1000 560 L0 560 Z" fill="#8ec55c" />
      <path
        d="M0 424 Q 300 396 620 436 Q 820 458 1000 430 L1000 560 L0 560 Z"
        fill="#9ed36a"
        stroke="#7cb350"
        strokeWidth="5"
      />

      <Tree x={860} y={330} s={0.85} fruit={!changed.has("fruit")} />
      <Fence x={250} y={430} w={280} />

      <path
        d="M140 466 L206 336"
        stroke={changed.has("stick") ? "#e0453f" : "#8b5a2b"}
        strokeWidth="11"
        strokeLinecap="round"
      />
      <Flower x={60} y={505} s={0.9} petal={changed.has("flower") ? "#ffd23f" : "#e0453f"} />

      <Goat x={270} y={500} s={0.95} coat="#f6efe2" />
      <Goat x={450} y={505} s={0.9} coat="#c58b52" />
      {!changed.has("goat-gone") ? <Goat x={640} y={500} s={0.95} coat="#7d8794" /> : null}

      <Person x={830} y={480} s={0.9} shirt={changed.has("shirt") ? "#e0453f" : "#f0f0f0"} trouser="#2f4a7d" />
    </svg>
  );
}