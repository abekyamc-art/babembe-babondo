import React from "react";
import { Image } from "@/components/ui/image";

/** The pictures an answer came with, below the answer, at a size the picture is read at. */
export default function AnswerPictures({ pictures = [] }) {
  const standing = (Array.isArray(pictures) ? pictures : []).filter((pic) => pic?.url);
  if (!standing.length) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {standing.map((pic, index) => (
        <figure key={`${pic.url}-${index}`} className="m-0">
          <Image
            src={pic.url}
            alt={pic.term || pic.name || "A picture of the knowledge"}
            fittingType="fit"
            className="block h-44 w-44 rounded-xl border border-border bg-muted object-contain"
          />
          <figcaption className="mt-1 max-w-44 truncate font-body text-xs text-muted-foreground">
            {pic.term || pic.name}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}