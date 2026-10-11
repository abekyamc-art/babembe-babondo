import React from "react";
import { Check, Lock } from "lucide-react";
import { Image } from "@/components/ui/image";

/**
 * One season's trophy on the shelf: lit in gold once the season has been cleared, and standing dark as a
 * silhouette while it is still being earned, so its place is seen before it is won.
 */
export default function TrophyCard({ no, title, won, done, total, wonAt, url }) {
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
          {won ? `Won${wonAt ? ` · ${wonAt}` : ""}` : `${done} of ${total} episodes`}
        </span>
      </div>
    </div>
  );
}