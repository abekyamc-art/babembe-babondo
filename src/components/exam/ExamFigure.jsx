import React, { useState } from "react";
import { Expand, X } from "lucide-react";
import { Image } from "@/components/ui/image";
import { DIAGRAM_URL } from "@/lib/examBank";

/**
 * The study illustration, held to the view the question is about, with the whole plate one tap away.
 * It is a reference for the student's eyes: no numbered callout is ever read out as though it were a
 * confirmed word.
 */
export default function ExamFigure({ view, spot }) {
  const [whole, setWhole] = useState(false);

  return (
    <>
      <button
        type="button"
        className="exam-figure"
        onClick={() => setWhole(true)}
        aria-label={`Enlarge the illustration — ${view}`}
      >
        <Image
          src={DIAGRAM_URL}
          fittingType="fill"
          focalPointX={spot?.x}
          focalPointY={spot?.y}
          className="exam-figure-img"
          alt="Medical study illustration: the urinary system, the internal organs, and the female and male reproductive systems, each numbered"
        />
        <span className="exam-figure-note">
          <span>{view}</span>
          <span className="exam-figure-more">
            <Expand className="h-3 w-3" /> Tap to enlarge
          </span>
        </span>
      </button>

      {whole ? (
        <div
          className="exam-viewer"
          role="dialog"
          aria-modal="true"
          aria-label="Medical study illustration"
          onClick={() => setWhole(false)}
        >
          <Image
            src={DIAGRAM_URL}
            fittingType="fit"
            className="exam-viewer-img"
            alt="Medical study illustration: the urinary system, the internal organs, and the female and male reproductive systems, each numbered"
          />
          <span className="exam-viewer-shut">
            <X className="h-4 w-4" /> Tap anywhere to close
          </span>
        </div>
      ) : null}
    </>
  );
}