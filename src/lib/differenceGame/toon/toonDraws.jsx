import React from "react";
import {
  INK,
  Sun,
  Cloud,
  Tree,
  Flower,
  Person,
  Pot,
  Bucket,
  Chicken,
  Basket,
  Crate,
  Sack,
  Scale,
  Globe,
  Books,
  Backpack,
  Plant,
  Birds,
  Drum,
  Stool,
  Goat,
  Fence,
  Basin,
  Cloth,
} from "@/components/diffgame/scenes/parts";

/**
 * The drawings of the cartoon episodes: the pieces the app already carries, and the pieces a village
 * scene needs beyond them — a hut, a palm, a canoe, a bicycle, a motorbike, a cart, a mat, a jug, a bowl, a
 * fish, an oil lamp and a jerrycan.
 *
 * Every drawing takes the piece's own place and size, and — where the piece may be turned to another
 * colour — the colour it is turned to. A turned piece is drawn in that colour and nothing else about it
 * changes, so the two copies of a scene are the same picture in every other line.
 */

/** A hut: the roof, the wall, the door and one small window. */
const Hut = ({ x, y, s = 1, roof = "#b5623d" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <polygon points="-112,-98 0,-162 112,-98" fill={roof} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
    <rect x="-88" y="-98" width="176" height="98" rx="6" fill="#eddcbe" stroke={INK} strokeWidth="6" />
    <rect x="18" y="-68" width="48" height="68" rx="5" fill="#8b5a2b" stroke={INK} strokeWidth="5" />
    <rect x="-72" y="-74" width="54" height="42" rx="5" fill="#a9def7" stroke={INK} strokeWidth="5" />
    <path d="M-45 -74 V-32 M-72 -53 H-18" stroke={INK} strokeWidth="5" />
  </g>
);

/** A palm: one tall bending trunk with its crown of fronds. */
const Palm = ({ x, y, s = 1, frond = "#3f9d54" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-14 0 q22 -150 6 -268" fill="none" stroke="#8b5a2b" strokeWidth="30" strokeLinecap="round" />
    <path d="M-14 0 q22 -150 6 -268" fill="none" stroke="#a9723f" strokeWidth="12" strokeLinecap="round" opacity="0.55" />
    <g fill={frond} stroke={INK} strokeWidth="5" strokeLinejoin="round">
      <path d="M0 -262 q-92 -30 -118 26 q70 12 118 -26 z" />
      <path d="M0 -262 q92 -30 118 26 q-70 12 -118 -26 z" />
      <path d="M0 -266 q-42 -62 -104 -54 q34 62 104 54 z" />
      <path d="M0 -266 q42 -62 104 -54 q-34 62 -104 54 z" />
      <path d="M6 -258 q26 -58 84 -70 q-10 62 -84 70 z" />
    </g>
    <circle cx="-6" cy="-250" r="14" fill="#c58b52" stroke={INK} strokeWidth="5" />
  </g>
);

/** A canoe: the hollowed hull with its two cross seats. */
const Canoe = ({ x, y, s = 1, hull = "#8b5a2b" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-165 -14 q165 60 330 0 q-24 74 -52 82 h-226 z" fill={hull} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
    <path d="M-122 -6 q122 34 244 0" fill="none" stroke="#a9723f" strokeWidth="9" />
    <rect x="-58" y="-24" width="18" height="26" fill="#c58b52" stroke={INK} strokeWidth="5" />
    <rect x="40" y="-24" width="18" height="26" fill="#c58b52" stroke={INK} strokeWidth="5" />
  </g>
);

/** A bicycle: the two wheels, the frame and the handlebar. */
const Bicycle = ({ x, y, s = 1, frame = "#2f6fb0" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <circle cx="-72" cy="-52" r="52" fill="none" stroke={INK} strokeWidth="7" />
    <circle cx="72" cy="-52" r="52" fill="none" stroke={INK} strokeWidth="7" />
    <path
      d="M-72 -52 L-14 -122 L58 -122 L72 -52 M-14 -122 L26 -52 L-72 -52 M14 -132 h40"
      fill="none"
      stroke={frame}
      strokeWidth="12"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M58 -122 l14 -32 M-14 -122 l-24 -16" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
    <path d="M-40 -126 h56" stroke="#4b4b52" strokeWidth="10" strokeLinecap="round" />
  </g>
);

/** A motorbike: the wheels, the tank and the handlebar. */
const Motorbike = ({ x, y, s = 1, body = "#2f6fb0" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <circle cx="-74" cy="-46" r="46" fill="none" stroke={INK} strokeWidth="9" />
    <circle cx="76" cy="-46" r="46" fill="none" stroke={INK} strokeWidth="9" />
    <path d="M-74 -46 q22 -62 74 -62 q44 0 56 58" fill="none" stroke={INK} strokeWidth="8" />
    <path d="M-58 -74 q58 -22 128 -8 q8 24 -14 30 q-70 14 -114 0 z" fill={body} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
    <path d="M-84 -110 h46 l6 22" fill="none" stroke={INK} strokeWidth="8" strokeLinecap="round" />
    <path d="M74 -84 l16 -40 M50 -126 h52" fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" />
  </g>
);

/** A cart: the shallow box on its two wheels with the pulling pole. */
const Cart = ({ x, y, s = 1, wood = "#c58b52" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-136 -58 h212 l-16 68 h-196 z" fill={wood} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
    <path d="M-124 -30 h196 M-120 -4 h188" stroke="#a9723f" strokeWidth="7" />
    <path d="M-140 -58 l-46 -26" fill="none" stroke="#8b5a2b" strokeWidth="12" strokeLinecap="round" />
    <circle cx="-64" cy="12" r="40" fill="#a9723f" stroke={INK} strokeWidth="7" />
    <circle cx="-64" cy="12" r="12" fill="#c58b52" stroke={INK} strokeWidth="5" />
    <circle cx="66" cy="12" r="40" fill="#a9723f" stroke={INK} strokeWidth="7" />
    <circle cx="66" cy="12" r="12" fill="#c58b52" stroke={INK} strokeWidth="5" />
  </g>
);

/** A mat: the woven cloth laid on the ground. */
const Mat = ({ x, y, s = 1, colour = "#d9c39a" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-116 -14 h232 l22 34 h-276 z" fill={colour} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
    <path d="M-92 2 h184 M-104 -8 h208" stroke="#a9723f" strokeWidth="5" opacity="0.7" />
  </g>
);

/** A jug: the round body, the neck and the handle. */
const Jug = ({ x, y, s = 1, clay = "#d9a253" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-40 -66 q40 -18 80 0 q22 68 -8 74 h-64 q-30 -6 -8 -74 z" fill={clay} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
    <path d="M-26 -66 q26 -16 52 0 l-6 -22 h-40 z" fill={clay} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
    <path d="M40 -58 q36 14 4 48" fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" />
    <path d="M-16 4 q16 14 32 0" fill="none" stroke="#a9723f" strokeWidth="5" />
  </g>
);

/** A bowl: the shallow bowl with what it holds standing over its lip. */
const Bowl = ({ x, y, s = 1, clay = "#e8bd77" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-64 -26 q64 62 128 0 z" fill={clay} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
    <ellipse cx="0" cy="-26" rx="64" ry="17" fill="#fdf6ec" stroke={INK} strokeWidth="6" />
    <circle cx="-16" cy="-40" r="12" fill="#e0453f" stroke={INK} strokeWidth="4" />
    <circle cx="16" cy="-44" r="12" fill="#e0453f" stroke={INK} strokeWidth="4" />
    <circle cx="0" cy="-24" r="11" fill="#f0a020" stroke={INK} strokeWidth="4" />
  </g>
);

/** A fish: the body, the tail fins and the eye. */
const Fish = ({ x, y, s = 1, body = "#9fb2c7" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-60 -14 q58 -34 116 0 q-58 34 -116 0 z" fill={body} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
    <path d="M56 0 l44 -30 v60 z" fill="#cfd8e3" stroke={INK} strokeWidth="6" strokeLinejoin="round" />
    <path d="M-8 -18 q16 18 0 34" fill="none" stroke={INK} strokeWidth="5" />
    <circle cx="-30" cy="-4" r="5" fill={INK} />
  </g>
);

/** An oil lamp: the little clay lamp with its flame. */
const Lamp = ({ x, y, s = 1, glass = "#ffd23f" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-34 -6 q-22 34 0 46 h68 q22 -12 0 -46 z" fill="#d9a253" stroke={INK} strokeWidth="6" strokeLinejoin="round" />
    <path d="M-18 -34 q18 -34 36 0 q-18 24 -36 0 z" fill={glass} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
    <path d="M0 -60 q10 -16 0 -26 q-10 12 0 26 z" fill="#f0a020" stroke={INK} strokeWidth="4" />
    <path d="M-34 -6 h68" stroke={INK} strokeWidth="5" />
  </g>
);

/** A jerrycan: the square body, the cap and the handle. */
const Jerrycan = ({ x, y, s = 1, body = "#cfd8e3" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x="-48" y="-84" width="96" height="84" rx="10" fill={body} stroke={INK} strokeWidth="6" />
    <path d="M-30 -60 h60" stroke="rgba(47,36,24,0.25)" strokeWidth="7" />
    <rect x="-16" y="-102" width="32" height="20" rx="5" fill="#9fb2c7" stroke={INK} strokeWidth="5" />
    <path d="M-34 -92 q34 -24 68 0" fill="none" stroke={INK} strokeWidth="7" />
  </g>
);

/** Which drawing stands for which piece. */
export const DRAWS = {
  sun: (p, tint) => <Sun x={p.x} y={p.y} r={46 * p.s} body={tint || "#ffd23f"} />,
  cloud: (p, tint) => <Cloud x={p.x} y={p.y} s={p.s} fill={tint || "#ffffff"} />,
  birds: (p, tint) => <Birds x={p.x} y={p.y} s={p.s} color={tint || "#3b5b8f"} />,
  tree: (p, tint) => <Tree x={p.x} y={p.y} s={p.s} leaf={tint || "#3f9d54"} />,
  palm: (p, tint) => <Palm x={p.x} y={p.y} s={p.s} frond={tint || "#3f9d54"} />,
  hut: (p, tint) => <Hut x={p.x} y={p.y} s={p.s} roof={tint || "#b5623d"} />,
  flower: (p, tint) => <Flower x={p.x} y={p.y} s={p.s} petal={tint || "#e0453f"} />,
  plant: (p, tint) => <Plant x={p.x} y={p.y} s={p.s} leaf={tint || "#3f9d54"} />,
  person: (p, tint) => <Person x={p.x} y={p.y} s={p.s} shirt={tint || "#2f6fb0"} />,
  goat: (p, tint) => <Goat x={p.x} y={p.y} s={p.s} coat={tint || "#f6efe2"} />,
  chicken: (p, tint) => <Chicken x={p.x} y={p.y} s={p.s} body={tint || "#fdf6ec"} />,
  pot: (p, tint) => <Pot x={p.x} y={p.y} s={p.s} metal={tint || "#61616d"} base={tint || "#4a4a52"} />,
  bucket: (p, tint) => <Bucket x={p.x} y={p.y} s={p.s} fill={tint || "#cfd8e3"} />,
  basin: (p, tint) => <Basin x={p.x} y={p.y} s={p.s} fill={tint || "#cfd8e3"} />,
  basket: (p, tint) => <Basket x={p.x} y={p.y} s={p.s} fill={tint || "#d9a253"} />,
  crate: (p, tint) => <Crate x={p.x} y={p.y} s={p.s} fill={tint || "#c58b52"} />,
  sack: (p, tint) => <Sack x={p.x} y={p.y} s={p.s} fill={tint || "#d9c39a"} />,
  drum: (p, tint) => <Drum x={p.x} y={p.y} s={p.s} cloth={tint || "#3f9d54"} />,
  stool: (p, tint) => <Stool x={p.x} y={p.y} s={p.s} top={tint || "#c58b52"} />,
  cloth: (p, tint) => <Cloth x={p.x} y={p.y} s={p.s} color={tint || "#fdf6ec"} />,
  fence: (p, tint) => <Fence x={p.x} y={p.y} s={p.s} w={240} wood={tint || "#c58b52"} />,
  canoe: (p, tint) => <Canoe x={p.x} y={p.y} s={p.s} hull={tint || "#8b5a2b"} />,
  bicycle: (p, tint) => <Bicycle x={p.x} y={p.y} s={p.s} frame={tint || "#2f6fb0"} />,
  motorbike: (p, tint) => <Motorbike x={p.x} y={p.y} s={p.s} body={tint || "#2f6fb0"} />,
  cart: (p, tint) => <Cart x={p.x} y={p.y} s={p.s} wood={tint || "#c58b52"} />,
  mat: (p, tint) => <Mat x={p.x} y={p.y} s={p.s} colour={tint || "#d9c39a"} />,
  jug: (p, tint) => <Jug x={p.x} y={p.y} s={p.s} clay={tint || "#d9a253"} />,
  bowl: (p, tint) => <Bowl x={p.x} y={p.y} s={p.s} clay={tint || "#e8bd77"} />,
  fish: (p, tint) => <Fish x={p.x} y={p.y} s={p.s} body={tint || "#9fb2c7"} />,
  lamp: (p, tint) => <Lamp x={p.x} y={p.y} s={p.s} glass={tint || "#ffd23f"} />,
  jerrycan: (p, tint) => <Jerrycan x={p.x} y={p.y} s={p.s} body={tint || "#cfd8e3"} />,
  globe: (p, tint) => <Globe x={p.x} y={p.y} s={p.s} sea={tint || "#6cc0e5"} />,
  books: (p, tint) => <Books x={p.x} y={p.y} s={p.s} top={tint || "#e0453f"} />,
  backpack: (p, tint) => <Backpack x={p.x} y={p.y} s={p.s} body={tint || "#e0453f"} />,
  scale: (p, tint) => <Scale x={p.x} y={p.y} s={p.s} pan={tint || "#cfd8e3"} />,
};