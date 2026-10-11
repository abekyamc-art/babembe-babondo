import React from "react";

export default function PhotoObject({ object, changed }) {
  const colour = changed ? "#2563eb" : "#ef4444";
  const shape = {
    ball: <><circle cx="50" cy="50" r="32" fill={colour} /><path d="M20 40Q50 65 80 40M50 18Q30 50 50 82" fill="none" /></>,
    flower: <><path d="M50 58V92M50 80L30 68" stroke="#15803d" /><g fill={colour}>{[[50,23],[28,40],[72,40],[36,64],[64,64]].map(([x,y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="16" />)}</g><circle cx="50" cy="44" r="12" fill="#fde047" /></>,
    bucket: <><path d="M24 35Q50 -5 76 35" fill="none" /><path d="M20 35H80L72 85H28Z" fill={colour} /><ellipse cx="50" cy="35" rx="30" ry="9" fill="#f8fafc" /></>,
    bird: <><ellipse cx="47" cy="57" rx="30" ry="22" fill={colour} /><circle cx="72" cy="35" r="17" fill={colour} /><path d="M88 34L98 40L88 45" fill="#facc15" /><path d="M21 48L7 32L10 64M36 78V92M55 78V92" fill={colour} /><path d="M30 54Q47 35 60 59" fill="none" /><circle cx="76" cy="32" r="3" fill="#0f172a" /></>,
    basket: <><path d="M20 42Q50 -12 80 42" fill="none" /><path d="M15 40H85L75 85H25Z" fill={colour} /><path d="M22 56H78M26 70H74M38 42V84M62 42V84" fill="none" /></>,
    flag: <><path d="M24 10V94" fill="none" /><path d="M27 12H85L68 34L85 56H27Z" fill={colour} /></>,
    pot: <><path d="M15 43Q-2 65 20 71M85 43Q102 65 80 71" fill="none" /><path d="M20 40H80V65Q80 87 50 87Q20 87 20 65Z" fill={colour} /><path d="M14 39H86M35 30Q50 8 65 30" fill="none" /></>,
    lantern: <><path d="M35 18Q50 -5 65 18" fill="none" /><path d="M28 25H72L80 80H20Z" fill={colour} /><rect x="35" y="38" width="30" height="30" rx="4" fill="#fde047" /><path d="M20 83H80M28 22H72" fill="none" /></>,
    book: <><path d="M17 20H78V83H17Q7 75 17 67Z" fill={colour} /><path d="M17 67H78V83H17Q7 75 17 67Z" fill="#f8fafc" /><path d="M28 22V64M36 36H65M36 48H60" fill="none" /></>,
    fish: <><path d="M18 50Q50 5 82 50Q50 95 18 50Z" fill={colour} /><path d="M18 50L3 27V73Z" fill={colour} /><path d="M55 31Q43 50 55 69" fill="none" /><circle cx="68" cy="46" r="3" fill="#0f172a" /></>,
    kite: <><path d="M50 8L80 42L50 76L20 42Z" fill={colour} /><path d="M50 8V76M20 42H80M50 76Q30 86 50 97" fill="none" /></>,
    cup: <><path d="M73 36Q105 34 88 63H73" fill="none" /><path d="M20 30H75V65Q75 85 48 85Q20 85 20 65Z" fill={colour} /><ellipse cx="48" cy="30" rx="28" ry="8" fill="#f8fafc" /></>,
  };
  return <g stroke="#172033" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">{shape[object]}</g>;
}