import React from "react";
import ToonBackdrop from "./ToonBackdrop";
import { DRAWS } from "./toonDraws";

/**
 * One cartoon episode's picture.
 *
 * The same scene stands twice in a level: this is one of the two copies. Everything it carries is drawn
 * from the episode's own plan, so the two copies are the same picture in every line and every colour bar
 * what `changed` names — a piece taken away, or a piece turned to another colour. A piece that is taken
 * away is simply not drawn, and a piece that is turned is drawn in the colours of its own change, so the
 * change is always seen and never has to be guessed at.
 */
export default function ToonScene({ spec, changed, uid }) {
  const marked = changed || new Set();

  return (
    <svg viewBox="0 0 1000 560" className="dg-art" role="img" aria-label={spec.label}>
      <ToonBackdrop setting={spec.setting} tone={spec.tone} uid={uid} />
      {spec.items.map((item) => {
        const change = item.change && marked.has(item.key) ? item.change : null;
        if (change && change.how === "hide") return null;
        const draw = DRAWS[item.kind];
        if (!draw) return null;
        return <React.Fragment key={item.key}>{draw(item, change ? change.colour : undefined)}</React.Fragment>;
      })}
    </svg>
  );
}