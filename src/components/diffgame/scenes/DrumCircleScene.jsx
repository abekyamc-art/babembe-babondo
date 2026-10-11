import React from "react";
import { Sun, Cloud, Person, Pot, Stool, Drum, Basket } from "./parts";

/**
 * The drum circle: the big drum on its stand with its cloth, the drummer and the dancer beside the
 * cooking fire, and the family's baskets set down on the grass. One drawing, drawn twice — only what
 * `changed` names is taken away or turned, so the two copies are the same picture in everything else.
 */
export default function DrumCircleScene({ changed, uid }) {
  return (
    <svg
      viewBox="0 0 1000 560"
      className="dg-art"
      role="img"
      aria-label="A big drum with a drummer and a dancer beside a cooking fire"
    >
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd9a8" />
          <stop offset="100%" stopColor="#fff6ea" />
        </linearGradient>
      </defs>
      <rect width="1000" height="560" fill={`url(#${uid}-sky)`} />
      <Sun x={128} y={92} r={44} face={!changed.has("sun-face")} />
      <Cloud x={330} y={64} s={0.55} />
      {!changed.has("cloud") ? <Cloud x={790} y={72} s={0.72} /> : null}

      <path
        d="M0 452 Q 240 414 520 444 Q 760 468 1000 424 L1000 560 L0 560 Z"
        fill="#9ed36a"
        stroke="#7cb350"
        strokeWidth="5"
      />
      <path d="M0 502 Q 300 486 620 512 Q 820 526 1000 508 L1000 560 L0 560 Z" fill="#8ec55c" />

      <Drum x={500} y={402} cloth={changed.has("drum-cloth") ? "#7b4bd1" : "#3f9d54"} />
      {!changed.has("stool") ? <Stool x={860} y={508} s={1.1} /> : null}

      <g strokeLinecap="round">
        <path d="M112 470 L214 452" stroke="#8b5a2b" strokeWidth="13" />
        <path d="M120 484 L208 488" stroke="#a9723f" strokeWidth="13" />
      </g>
      <Pot x={168} y={466} steam={!changed.has("pot-steam")} />

      <Person x={300} y={470} s={0.8} shirt="#2f6fb0" hat={changed.has("hat")} hatColor="#f0a020" />
      <Person x={640} y={470} s={0.9} shirt={changed.has("shirt") ? "#ffd23f" : "#d94f6a"} />
      <Basket x={392} y={508} s={0.9} />
    </svg>
  );
}