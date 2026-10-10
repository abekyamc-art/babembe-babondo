import React, { useState } from "react";
import { Expand, X } from "lucide-react";
import { Image } from "@/components/ui/image";
import { DIAGRAM_URL } from "@/lib/examBank";

const PLATE_ALT =
  "Medical study illustration: the urinary system, the internal organs, and the female and male reproductive systems, each numbered";

/**
 * The picture a question is studied on: the question's own illustration where it has one, and the
 * medical study plate where it has none. The whole picture stands one tap away. It is a reference for
 * the student's eyes: no numbered callout is ever read out as though it were a confirmed word.
 */
export default function ExamFigure({ view, spot, image }) {
  const [whole, setWhole] = useState(false);
  const src = image?.url || DIAGRAM_URL;
  const caption = image?.scene || view;
  const alt = image?.alt || PLATE_ALT;

  return (
    <>
      <button
        type="button"
        className="exam-figure"
        onClick={() => setWhole(true)}
        aria-label={`Enlarge the illustration — ${caption}`}
      >
        <Image
          src={src}
          fittingType="fill"
          focalPointX={image ? 0.5 : spot?.x}
          focalPointY={image ? 0.5 : spot?.y}
          className="exam-figure-img"
          alt={alt}
        />
        <span className="exam-figure-note">
          <span>{caption}</span>
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
          aria-label={caption}
          onClick={() => setWhole(false)}
        >
          <Image src={src} fittingType="fit" className="exam-viewer-img" alt={alt} />
          <span className="exam-viewer-shut">
            <X className="h-4 w-4" /> Tap anywhere to close
          </span>
        </div>
      ) : null}
    </>
  );
}