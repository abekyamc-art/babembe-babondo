import React from "react";
import { INK, Cloud, Person, Basket, Crate, Sack, Scale } from "./parts";

/**
 * The market day: a striped stall with fruit on the table, the vendor beside it, and the baskets and the
 * crate on the ground. One drawing, drawn twice — only what `changed` names is taken away or turned.
 */
export default function MarketScene({ changed, uid }) {
  return (
    <svg
      viewBox="0 0 1000 560"
      className="dg-art"
      role="img"
      aria-label="A market stall with fruit, a vendor and baskets on the ground"
    >
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffeab8" />
          <stop offset="100%" stopColor="#fffaf0" />
        </linearGradient>
        <clipPath id={`${uid}-awn`}>
          <polygon points="150,178 850,178 802,262 198,262" />
        </clipPath>
      </defs>
      <rect width="1000" height="560" fill={`url(#${uid}-sky)`} />
      <Cloud x={250} y={70} s={0.6} />
      <Cloud x={700} y={56} s={0.5} />

      <rect y="400" width="1000" height="160" fill="#e8d3a9" />
      <rect y="478" width="1000" height="82" fill="#d8bd8c" />

      <rect x="185" y="178" width="18" height="236" rx="6" fill="#8b5a2b" stroke={INK} strokeWidth="5" />
      <rect x="800" y="178" width="18" height="236" rx="6" fill="#8b5a2b" stroke={INK} strokeWidth="5" />

      <g clipPath={`url(#${uid}-awn)`}>
        <rect x="150" y="178" width="700" height="90" fill="#fdf6ec" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <rect
            key={i}
            x={150 + i * 100}
            y="178"
            width="50"
            height="90"
            fill={i % 2 === 0 ? "#e0453f" : "#fdf6ec"}
          />
        ))}
      </g>
      <polygon points="150,178 850,178 802,262 198,262" fill="none" stroke={INK} strokeWidth="7" strokeLinejoin="round" />

      <rect x="180" y="350" width="640" height="26" rx="8" fill="#a9723f" stroke={INK} strokeWidth="6" />
      <rect x="196" y="374" width="608" height="72" rx="10" fill="#2f6fb0" stroke={INK} strokeWidth="6" />
      <rect
        x="400"
        y="374"
        width="200"
        height="72"
        fill={changed.has("cloth-band") ? "#e0803f" : "#8ec55c"}
        stroke={INK}
        strokeWidth="5"
      />
      <rect x="196" y="374" width="608" height="72" rx="10" fill="none" stroke={INK} strokeWidth="6" />

      {!changed.has("watermelon") ? (
        <g>
          <ellipse cx="265" cy="312" rx="52" ry="38" fill="#2f9e44" stroke={INK} strokeWidth="5" />
          <path d="M-14 0 q14 -20 28 0 q14 20 28 0" fill="none" stroke="#1f7a33" strokeWidth="7" transform="translate(251 286)" />
          <path d="M222 296 q43 26 86 0" fill="none" stroke="#1f7a33" strokeWidth="7" />
        </g>
      ) : null}

      <g fill={changed.has("tomatoes") ? "#f0a020" : "#e0453f"} stroke={INK} strokeWidth="5">
        <circle cx="402" cy="310" r="16" />
        <circle cx="432" cy="300" r="16" />
        <circle cx="462" cy="314" r="16" />
        <circle cx="416" cy="332" r="16" />
        <circle cx="448" cy="334" r="16" />
      </g>

      <g>
        <path d="M532 330 q28 -34 56 -28 q-6 34 -34 38 q-16 4 -22 -10 z" fill="#ffd23f" stroke={INK} strokeWidth="5" />
        <path d="M560 302 q10 -18 22 -22" fill="none" stroke="#8b5a2b" strokeWidth="6" strokeLinecap="round" />
      </g>

      <Scale x={690} y={306} s={0.85} />

      <Person
        x={930}
        y={440}
        s={0.95}
        shirt={changed.has("shirt") ? "#2f6fb0" : "#d94f4f"}
        hat
        hatColor="#f0a020"
      />

      <Basket x={150} y={500} s={1} />
      <Sack x={430} y={516} s={1} />
      {!changed.has("crate") ? <Crate x={770} y={500} s={1} /> : null}
    </svg>
  );
}