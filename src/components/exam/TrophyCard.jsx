import React, { useState } from "react";
import { Check, Copy, Lock } from "lucide-react";
import { Image } from "@/components/ui/image";

/**
 * One season's trophy on the shelf: lit in gold once the season has been cleared, and standing dark as a
 * silhouette while it is still being earned, so its place is seen before it is won.
 *
 * A won cup carries the season's own reward code, written on the cup itself, and the code is copied in
 * one tap. A season still to be cleared writes no code of its own: only the shape of it stands there.
 */

/** Copies one line, with the phone's own box as a fallback where the clipboard is refused. */
async function copyLine(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // the clipboard is refused on some phones: the line is still copied through a box of its own
  }
  try {
    const box = document.createElement("textarea");
    box.value = text;
    box.setAttribute("readonly", "");
    box.style.position = "fixed";
    box.style.top = "0";
    box.style.opacity = "0";
    document.body.appendChild(box);
    box.select();
    const done = document.execCommand("copy");
    document.body.removeChild(box);
    return done;
  } catch (err) {
    return false;
  }
}

export default function TrophyCard({ no, title, won, done, total, wonAt, url, code }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!code) return;
    const done = await copyLine(code);
    if (!done) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`exam-trophy ${won ? "is-won" : "is-locked"}`}>
      <div className="exam-trophy-frame">
        {url ? (
          <Image
            src={url}
            alt={`The trophy of season ${no}`}
            className="exam-trophy-img"
            fittingType="fill"
          />
        ) : null}
        <span className="exam-trophy-no">S{no}</span>
        <span className="exam-trophy-seal">{won ? <Check /> : <Lock />}</span>
      </div>

      <div className="exam-trophy-body">
        <span className="exam-trophy-name">Season {no}</span>
        <span className="exam-trophy-title">{title}</span>
        <span className="exam-trophy-tag">
          {won ? `Won${wonAt ? ` · ${wonAt}` : ""}` : total ? `${done} of ${total} episodes` : "Waiting for its season"}
        </span>
      </div>

      <div className="exam-trophy-code">
        <span className="exam-trophy-code-text">{won && code ? code : "GS-••••-••••"}</span>
        {won && code ? (
          <button type="button" className="exam-trophy-copy" onClick={copy}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        ) : null}
      </div>
    </div>
  );
}