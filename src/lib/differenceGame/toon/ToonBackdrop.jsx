import React from "react";
import { RiverBand } from "@/components/diffgame/scenes/parts";
import { SETTINGS, TONES } from "@/lib/differenceGame/toon/toonStage";

/** The stars a night episode stands under, so the dark sky reads as night at a glance. */
const STARS = [
  [82, 62, 4], [188, 104, 3], [286, 52, 5], [372, 128, 3], [468, 74, 4], [560, 38, 3],
  [648, 116, 4], [742, 64, 3], [836, 126, 5], [918, 50, 3], [132, 166, 3], [704, 182, 3],
];

/**
 * The place an episode is played in: the sky of its own light, whatever that setting stands on — a meadow,
 * a river bank, a village yard, a schoolyard, a hillside or a shore — and the ground running to the front
 * of the picture. The backdrop carries no difference of its own: it is the same in both copies of the
 * scene, so nothing can ever be marked on it.
 */
export default function ToonBackdrop({ setting, tone, uid }) {
  const place = SETTINGS[setting] || SETTINGS.meadow;
  const time = TONES[tone] || TONES.day;
  const horizon = place.horizon;
  const sky = `${uid}-toon-sky`;
  const field = `M0 ${horizon + 40} Q 250 ${horizon + 14} 520 ${horizon + 46} Q 770 ${horizon + 70} 1000 ${horizon + 26} L1000 560 L0 560 Z`;

  return (
    <g>
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={time.sky[0]} />
          <stop offset="100%" stopColor={time.sky[1]} />
        </linearGradient>
      </defs>
      <rect width="1000" height="560" fill={`url(#${sky})`} />

      {tone === "night"
        ? STARS.map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#fdf6ec" opacity="0.9" />
          ))
        : null}

      {setting === "hillside" ? (
        <path
          d={`M0 ${horizon + 24} Q 220 ${horizon - 58} 480 ${horizon + 12} Q 720 ${horizon - 48} 1000 ${horizon + 26} L1000 ${horizon + 66} L0 ${horizon + 66} Z`}
          fill={time.far}
        />
      ) : null}

      {setting === "schoolyard" ? (
        <g>
          <rect x="0" y={horizon - 44} width="1000" height="152" fill={time.wall} stroke="#8b7355" strokeWidth="5" />
          {[70, 300, 700, 880].map((x) => (
            <g key={x}>
              <rect x={x} y={horizon - 14} width="70" height="58" rx="6" fill="#a9def7" stroke="#8b7355" strokeWidth="5" />
              <path d={`M${x + 35} ${horizon - 14} V${horizon + 44}`} stroke="#8b7355" strokeWidth="5" />
            </g>
          ))}
          <rect x="0" y={horizon + 100} width="1000" height="14" fill={time.shade} />
        </g>
      ) : null}

      {setting === "riverbank" ? <RiverBand y={horizon + 26} height={118} /> : null}

      {setting === "shore" ? (
        <g>
          <rect x="0" y={horizon + 4} width="1000" height="104" fill={time.water} />
          <path
            d={`M0 ${horizon + 100} Q 250 ${horizon + 74} 520 ${horizon + 108} Q 760 ${horizon + 132} 1000 ${horizon + 96} L1000 560 L0 560 Z`}
            fill="#e8d9a8"
            stroke="#cbb887"
            strokeWidth="5"
          />
        </g>
      ) : null}

      {setting !== "shore" ? (
        <g>
          <path d={field} fill={time.ground} stroke={time.shade} strokeWidth="5" />
          <path
            d={`M0 ${horizon + 96} Q 320 ${horizon + 74} 640 ${horizon + 102} Q 820 ${horizon + 118} 1000 ${horizon + 96} L1000 560 L0 560 Z`}
            fill={time.shade}
          />
        </g>
      ) : null}
    </g>
  );
}