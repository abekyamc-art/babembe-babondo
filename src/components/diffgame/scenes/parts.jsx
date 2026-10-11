import React from "react";

/**
 * The pieces every scene of the game is drawn from: the sun, a cloud, a tree, a person, a pot, a basket
 * and the rest. They are the app's own drawings — clean flat cartoons with one ink line — and each one is
 * placed by the scene that uses it, so a difference can be one small part of a picture and nothing else.
 */
export const INK = "#2f2418";

export const Sun = ({ x, y, r = 46, face = true, body = "#ffd23f" }) => (
  <g>
    {Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4;
      return (
        <line
          key={i}
          x1={x + Math.cos(a) * (r + 10)}
          y1={y + Math.sin(a) * (r + 10)}
          x2={x + Math.cos(a) * (r + 28)}
          y2={y + Math.sin(a) * (r + 28)}
          stroke="#ffcf3f"
          strokeWidth="10"
          strokeLinecap="round"
        />
      );
    })}
    <circle cx={x} cy={y} r={r} fill={body} stroke={INK} strokeWidth="5" />
    {face ? (
      <g>
        <circle cx={x - 15} cy={y - 7} r="5" fill={INK} />
        <circle cx={x + 15} cy={y - 7} r="5" fill={INK} />
        <path d={`M${x - 17} ${y + 12} q17 15 34 0`} fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
      </g>
    ) : null}
  </g>
);

export const Cloud = ({ x, y, s = 1, fill = "#ffffff" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity="0.95">
    <ellipse cx="0" cy="-4" rx="62" ry="34" fill={fill} />
    <ellipse cx="-50" cy="8" rx="40" ry="25" fill={fill} />
    <ellipse cx="50" cy="6" rx="44" ry="27" fill={fill} />
    <rect x="-56" y="-6" width="112" height="34" rx="16" fill={fill} />
  </g>
);

export const Tree = ({ x, y, s = 1, fruit = true, leaf = "#3f9d54" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x="-19" y="-16" width="38" height="150" rx="12" fill="#8b5a2b" stroke={INK} strokeWidth="5" />
    <circle cx="0" cy="-78" r="88" fill={leaf} stroke={INK} strokeWidth="5" />
    <circle cx="-64" cy="-18" r="58" fill={leaf} stroke={INK} strokeWidth="5" />
    <circle cx="64" cy="-18" r="58" fill={leaf} stroke={INK} strokeWidth="5" />
    {fruit ? (
      <g>
        <circle cx="-36" cy="-84" r="14" fill="#e0453f" stroke={INK} strokeWidth="4" />
        <circle cx="26" cy="-46" r="14" fill="#e0453f" stroke={INK} strokeWidth="4" />
        <circle cx="44" cy="-100" r="14" fill="#e0453f" stroke={INK} strokeWidth="4" />
      </g>
    ) : null}
  </g>
);

export const Flower = ({ x, y, s = 1, petal = "#e0453f" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M0 44 L0 0" fill="none" stroke="#3f9d54" strokeWidth="7" strokeLinecap="round" />
    <ellipse cx="-18" cy="28" rx="16" ry="9" fill="#4bb063" transform="rotate(-18 -18 28)" />
    <circle cx="0" cy="-26" r="12" fill={petal} stroke={INK} strokeWidth="4" />
    <circle cx="-15" cy="-15" r="12" fill={petal} stroke={INK} strokeWidth="4" />
    <circle cx="15" cy="-15" r="12" fill={petal} stroke={INK} strokeWidth="4" />
    <circle cx="-10" cy="2" r="12" fill={petal} stroke={INK} strokeWidth="4" />
    <circle cx="10" cy="2" r="12" fill={petal} stroke={INK} strokeWidth="4" />
    <circle cx="0" cy="-13" r="8" fill="#ffd23f" stroke={INK} strokeWidth="4" />
  </g>
);

export const Person = ({ x, y, s = 1, skin = "#8d5524", shirt = "#2f6fb0", trouser = "#2f4a7d", hat = false, hatColor = "#e0453f" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x="-36" y="30" width="26" height="58" rx="11" fill={trouser} stroke={INK} strokeWidth="5" />
    <rect x="10" y="30" width="26" height="58" rx="11" fill={trouser} stroke={INK} strokeWidth="5" />
    <path d="M-30 -58 h60 l8 96 h-76 z" fill={shirt} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
    <path d="M-30 -50 q-26 34 -20 62" fill="none" stroke={shirt} strokeWidth="17" strokeLinecap="round" />
    <path d="M30 -50 q26 34 20 62" fill="none" stroke={shirt} strokeWidth="17" strokeLinecap="round" />
    <circle cx="0" cy="-92" r="30" fill={skin} stroke={INK} strokeWidth="5" />
    {hat ? (
      <path d="M-38 -104 h76 l-12 -22 h-52 z" fill={hatColor} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
    ) : null}
    <circle cx="-11" cy="-94" r="4.5" fill={INK} />
    <circle cx="11" cy="-94" r="4.5" fill={INK} />
    <path d="M-10 -78 q10 9 20 0" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
  </g>
);

export const Pot = ({ x, y, s = 1, steam = true, metal = "#61616d", base = "#4a4a52" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {steam ? (
      <g fill="none" stroke="#eaf6ff" strokeWidth="9" strokeLinecap="round" opacity="0.95">
        <path d="M-20 2 q14 -24 0 -48 q-14 -24 0 -48" />
        <path d="M16 8 q11 -20 0 -40 q-11 -20 0 -40" />
      </g>
    ) : null}
    <path d="M-74 -4 q-20 10 0 20" fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" />
    <path d="M74 -4 q20 10 0 20" fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" />
    <ellipse cx="0" cy="24" rx="54" ry="30" fill={base} stroke={INK} strokeWidth="5" />
    <rect x="-54" y="-6" width="108" height="30" rx="10" fill={metal} stroke={INK} strokeWidth="5" />
  </g>
);

export const Bucket = ({ x, y, s = 1, fill = "#cfd8e3" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-34 -26 h68 l-10 60 h-48 z" fill={fill} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
    <ellipse cx="0" cy="-26" rx="34" ry="11" fill="#eef4fb" stroke={INK} strokeWidth="5" />
    <path d="M-28 -32 q28 -34 56 0" fill="none" stroke={INK} strokeWidth="5" />
    <path d="M-22 10 h44" stroke="#9fb2c7" strokeWidth="5" strokeLinecap="round" />
  </g>
);

export const Chicken = ({ x, y, s = 1, body = "#fdf6ec" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-28 22 l-4 18 M-6 24 l0 18 M16 22 l4 18" stroke="#f0a020" strokeWidth="6" strokeLinecap="round" />
    <ellipse cx="0" cy="0" rx="32" ry="24" fill={body} stroke={INK} strokeWidth="5" />
    <circle cx="30" cy="-24" r="16" fill={body} stroke={INK} strokeWidth="5" />
    <path d="M46 -24 l18 6 l-18 6 z" fill="#f0a020" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
    <path d="M26 -40 q7 -13 13 0 q7 -13 13 0" fill="#e0453f" stroke={INK} strokeWidth="4" />
    <circle cx="34" cy="-26" r="4" fill={INK} />
    <path d="M-16 -18 q18 -10 30 10" fill="none" stroke={INK} strokeWidth="4" />
  </g>
);

export const Basket = ({ x, y, s = 1, fill = "#d9a253" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-46 -30 h92 l-14 66 h-64 z" fill={fill} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
    <path d="M-34 -6 h68 M-30 12 h60 M-26 30 h52" stroke="#a9723f" strokeWidth="5" />
    <ellipse cx="0" cy="-30" rx="46" ry="14" fill="#e8bd77" stroke={INK} strokeWidth="5" />
    <path d="M-40 -38 q40 -48 80 0" fill="none" stroke={INK} strokeWidth="6" />
  </g>
);

export const Crate = ({ x, y, s = 1, fill = "#c58b52" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x="-50" y="-46" width="100" height="92" rx="8" fill={fill} stroke={INK} strokeWidth="5" />
    <path d="M-50 -46 L50 46 M50 -46 L-50 46" stroke="#a9723f" strokeWidth="8" />
    <rect x="-50" y="-46" width="100" height="92" rx="8" fill="none" stroke={INK} strokeWidth="5" />
    <rect x="-50" y="-46" width="100" height="16" fill="#a9723f" stroke={INK} strokeWidth="4" />
  </g>
);

export const Sack = ({ x, y, s = 1, fill = "#d9c39a" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path
      d="M-46 44 q-14 -46 16 -62 q-18 -20 6 -30 q24 10 6 30 q30 16 16 62 z"
      fill={fill}
      stroke={INK}
      strokeWidth="5"
      strokeLinejoin="round"
    />
    <path d="M-30 10 q30 14 60 0" fill="none" stroke="#b09a72" strokeWidth="5" />
  </g>
);

export const Scale = ({ x, y, s = 1, pan = "#cfd8e3" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x="-46" y="30" width="92" height="16" rx="7" fill="#7d8794" stroke={INK} strokeWidth="5" />
    <rect x="-6" y="-60" width="12" height="94" rx="5" fill="#7d8794" stroke={INK} strokeWidth="5" />
    <rect x="-70" y="-72" width="140" height="12" rx="6" fill="#7d8794" stroke={INK} strokeWidth="5" />
    <path d="M-70 -60 q-30 28 0 54 M70 -60 q30 28 0 54" fill="none" stroke={INK} strokeWidth="5" />
    <path d="M-98 -6 q28 24 56 0 z" fill={pan} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
    <path d="M42 -6 q28 24 56 0 z" fill={pan} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
  </g>
);

export const Globe = ({ x, y, s = 1, sea = "#6cc0e5" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <circle cx="0" cy="-14" r="34" fill={sea} stroke={INK} strokeWidth="5" />
    <path d="M-28 -24 q16 12 34 4 q14 -6 24 8" fill="none" stroke="#3f9d54" strokeWidth="10" />
    <ellipse cx="0" cy="-14" rx="34" ry="13" fill="none" stroke="#3b82c4" strokeWidth="3" />
    <path d="M-12 18 q12 -22 24 0" fill="none" stroke="#7d8794" strokeWidth="8" />
    <rect x="-26" y="20" width="52" height="14" rx="7" fill="#7d8794" stroke={INK} strokeWidth="5" />
  </g>
);

export const Books = ({ x, y, s = 1, top = "#e0453f" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x="-46" y="-16" width="94" height="18" rx="5" fill="#2f6fb0" stroke={INK} strokeWidth="5" />
    <rect x="-42" y="-32" width="86" height="18" rx="5" fill="#f0a020" stroke={INK} strokeWidth="5" />
    <rect x="-46" y="-48" width="94" height="18" rx="5" fill={top} stroke={INK} strokeWidth="5" />
  </g>
);

export const Desk = ({ x, y, w = 280 }) => (
  <g>
    <rect x={x + 26} y={y + 80} width="22" height="48" rx="7" fill="#a9723f" stroke={INK} strokeWidth="5" />
    <rect x={x + w - 48} y={y + 80} width="22" height="48" rx="7" fill="#a9723f" stroke={INK} strokeWidth="5" />
    <rect x={x + 12} y={y + 18} width={w - 24} height="64" rx="8" fill="#dcae72" stroke={INK} strokeWidth="5" />
    <rect x={x} y={y} width={w} height="20" rx="7" fill="#c58b52" stroke={INK} strokeWidth="5" />
  </g>
);

export const Clock = ({ x, y, r = 60, hour = 300, minute = 60 }) => (
  <g transform={`translate(${x} ${y})`}>
    <circle r={r} fill="#ffffff" stroke={INK} strokeWidth="6" />
    <circle r={r - 12} fill="none" stroke="#c3d6e8" strokeWidth="3" />
    {[0, 90, 180, 270].map((a) => (
      <line key={a} y1={-(r - 10)} y2={-(r - 24)} stroke={INK} strokeWidth="6" strokeLinecap="round" transform={`rotate(${a})`} />
    ))}
    <line y1="6" y2={-(r * 0.52)} stroke={INK} strokeWidth="10" strokeLinecap="round" transform={`rotate(${hour})`} />
    <line y1="8" y2={-(r * 0.78)} stroke={INK} strokeWidth="7" strokeLinecap="round" transform={`rotate(${minute})`} />
    <circle r="7" fill="#e11d48" />
  </g>
);

export const Backpack = ({ x, y, s = 1, body = "#e0453f" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x="-48" y="-42" width="96" height="92" rx="20" fill={body} stroke={INK} strokeWidth="5" />
    <rect x="-30" y="-4" width="60" height="46" rx="12" fill="#f0a020" stroke={INK} strokeWidth="4" />
    <path d="M-22 -42 q22 -28 44 0" fill="none" stroke={INK} strokeWidth="6" />
    <rect x="-44" y="-30" width="14" height="62" rx="7" fill="#b8322c" stroke={INK} strokeWidth="4" />
  </g>
);

export const Plant = ({ x, y, s = 1, leaf = "#3f9d54" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-42 -30 q42 -66 84 0 z" fill={leaf} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
    <path d="M-52 -30 h104 l-14 62 h-76 z" fill="#c58b52" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
  </g>
);

export const Birds = ({ x, y, s = 1, color = "#3b5b8f" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round">
    <path d="M-30 0 q15 -18 30 0 q15 -18 30 0" />
  </g>
);

export const Drum = ({ x, y, s = 1, cloth = "#3f9d54" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-58 70 h116 l-16 -140 h-84 z" fill="#d9a253" stroke={INK} strokeWidth="6" strokeLinejoin="round" />
    <path d="M-70 -70 h140 l-12 -34 h-116 z" fill={cloth} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
    <ellipse cx="0" cy="-104" rx="58" ry="20" fill="#e8bd77" stroke={INK} strokeWidth="6" />
    <path d="M-52 6 h104 M-46 34 h92" stroke="#a9723f" strokeWidth="6" />
    <path d="M-78 -58 q78 -30 156 0" fill="none" stroke="#7d5a34" strokeWidth="9" strokeLinecap="round" />
  </g>
);

export const Stool = ({ x, y, s = 1, top = "#c58b52" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-36 -30 l-10 38 M36 -30 l10 38 M0 -26 l0 40" stroke="#8b5a2b" strokeWidth="10" strokeLinecap="round" />
    <ellipse cx="0" cy="-40" rx="54" ry="18" fill={top} stroke={INK} strokeWidth="6" />
  </g>
);

export const Goat = ({ x, y, s = 1, coat = "#f6efe2" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-34 16 l-6 30 M-12 20 l0 26 M18 18 l4 28 M36 14 l4 34" stroke="#8b5a2b" strokeWidth="7" strokeLinecap="round" />
    <ellipse cx="0" cy="0" rx="46" ry="26" fill={coat} stroke={INK} strokeWidth="5" />
    <circle cx="56" cy="-26" r="20" fill={coat} stroke={INK} strokeWidth="5" />
    <path d="M68 -48 q8 -22 24 -26" fill="none" stroke="#d9c39a" strokeWidth="8" strokeLinecap="round" />
    <path d="M46 -46 q-6 -20 -20 -22" fill="none" stroke="#d9c39a" strokeWidth="8" strokeLinecap="round" />
    <path d="M40 -18 q-16 10 -30 -2" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
    <path d="M-44 -4 q-18 -12 -24 6" fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" />
    <circle cx="62" cy="-28" r="4.5" fill={INK} />
    <path d="M72 -16 q9 4 0 9" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
  </g>
);

export const Fence = ({ x, y, w = 260, s = 1, wood = "#c58b52" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {[0, w / 2, w].map((dx) => (
      <rect key={dx} x={dx - 8} y="-70" width="16" height="82" rx="6" fill="#a9723f" stroke={INK} strokeWidth="5" />
    ))}
    <rect x="-16" y="-54" width={w + 32} height="13" rx="6" fill={wood} stroke={INK} strokeWidth="5" />
    <rect x="-16" y="-24" width={w + 32} height="13" rx="6" fill={wood} stroke={INK} strokeWidth="5" />
  </g>
);

export const Basin = ({ x, y, s = 1, fill = "#cfd8e3" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-64 -12 h128 l-24 46 h-80 z" fill={fill} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
    <ellipse cx="0" cy="-12" rx="64" ry="17" fill="#eef4fb" stroke={INK} strokeWidth="6" />
    <path d="M-38 -20 q38 16 76 0" fill="none" stroke="#9fb2c7" strokeWidth="5" />
  </g>
);

export const Cloth = ({ x, y, s = 1, color = "#fdf6ec" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-32 -38 h64 l-8 72 h-48 z" fill={color} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
    <path d="M-32 -38 q32 -14 64 0" fill="none" stroke={INK} strokeWidth="5" />
    <path d="M-20 6 h40" stroke="rgba(47,36,24,0.22)" strokeWidth="5" />
  </g>
);

export const RiverBand = ({ y = 370, height = 120 }) => (
  <g>
    <rect x="0" y={y} width="1000" height={height} fill="#6cc0e5" />
    <rect x="0" y={y} width="1000" height="14" fill="#8ed3ef" />
    <g fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" opacity="0.75">
      <path d={`M60 ${y + 46} q40 -16 80 0 q40 16 80 0`} />
      <path d={`M300 ${y + 78} q40 -16 80 0 q40 16 80 0`} />
      <path d={`M640 ${y + 40} q40 -16 80 0 q40 16 80 0`} />
      <path d={`M840 ${y + 84} q40 -16 80 0 q40 16 80 0`} />
    </g>
    <g fill="#9fb2c7" stroke={INK} strokeWidth="5">
      <ellipse cx="150" cy={y + 96} rx="46" ry="20" />
      <ellipse cx="470" cy={y + 104} rx="38" ry="16" />
      <ellipse cx="790" cy={y + 100} rx="52" ry="22" />
    </g>
  </g>
);