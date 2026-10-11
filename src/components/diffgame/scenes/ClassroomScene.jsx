import React from "react";
import { INK, Clock, Books, Desk, Person, Backpack, Globe, Plant, Birds } from "./parts";

/**
 * The classroom: the blackboard with its letters, the clock on the wall, the window, two desks with their
 * pupils, the books, the globe and the plant. One drawing, drawn twice — only what `changed` names is
 * taken away or turned.
 */
export default function ClassroomScene({ changed, uid }) {
  const rubbed = changed.has("chalk-letter");
  return (
    <svg
      viewBox="0 0 1000 560"
      className="dg-art"
      role="img"
      aria-label="A classroom with a blackboard, a clock, a window and two desks"
    >
      <defs>
        <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#cbeaff" />
          <stop offset="100%" stopColor="#eaf7ff" />
        </linearGradient>
      </defs>
      <rect width="1000" height="560" fill="#dceaf7" />
      <rect y="462" width="1000" height="20" fill="#c3d6e8" />
      <rect y="482" width="1000" height="78" fill="#d9b382" />
      <path d="M0 500 H1000 M0 536 H1000" stroke="#c19b68" strokeWidth="4" />

      <rect x="88" y="78" width="354" height="219" rx="10" fill="#8b5a2b" stroke={INK} strokeWidth="6" />
      <rect x="100" y="90" width="330" height="195" rx="6" fill="#2f5d4a" />
      <g fill="#eef7f2" fontFamily="system-ui, -apple-system, Segoe UI, sans-serif" fontSize="74" fontWeight="700" textAnchor="middle">
        {["A", "B", "C"].map((letter, i) =>
          rubbed && letter === "B" ? null : (
            <text key={letter} x={165 + i * 85} y={206}>
              {letter}
            </text>
          )
        )}
      </g>
      <rect x="100" y="292" width="330" height="18" rx="6" fill="#b98a55" stroke={INK} strokeWidth="5" />
      <rect x="126" y="286" width="46" height="10" rx="5" fill="#fdf6ec" />
      <rect x="188" y="286" width="38" height="10" rx="5" fill="#ffd23f" />

      <Clock x={545} y={140} r={60} hour={changed.has("clock-hands") ? 120 : 300} minute={changed.has("clock-hands") ? 240 : 60} />

      <rect x="688" y="78" width="254" height="209" rx="10" fill="#8b5a2b" stroke={INK} strokeWidth="6" />
      <rect x="700" y="90" width="230" height="185" rx="4" fill={`url(#${uid}-glass)`} />
      <path d="M700 232 q60 -46 120 -6 q60 38 110 -12 L930 275 L700 275 Z" fill="#8ec55c" />
      <path d="M712 200 q34 26 68 0" fill="none" stroke="#5c9e3f" strokeWidth="6" />
      <path d="M815 90 V275 M700 182 H930" stroke="#8b5a2b" strokeWidth="8" />
      <rect x="688" y="78" width="254" height="209" rx="10" fill="none" stroke={INK} strokeWidth="6" />
      {!changed.has("window-birds") ? (
        <g>
          <Birds x={760} y={136} s={0.72} />
          <Birds x={806} y={166} s={0.55} />
        </g>
      ) : null}

      <Globe x={840} y={380} s={0.9} sea={changed.has("globe-sea") ? "#ffd23f" : "#6cc0e5"} />
      <Desk x={610} y={400} w={280} />
      <Person x={750} y={422} s={0.62} shirt="#3f9d54" />

      <Books x={190} y={400} s={1.35} top={changed.has("book-top") ? "#3f9d54" : "#e0453f"} />
      <Desk x={110} y={400} w={280} />
      <Person x={250} y={422} s={0.62} shirt="#2f6fb0" />

      {!changed.has("plant") ? <Plant x={950} y={500} s={0.95} /> : null}
      {!changed.has("backpack") ? <Backpack x={60} y={495} s={1} /> : null}
    </svg>
  );
}