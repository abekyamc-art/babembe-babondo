import React from "react";
import { Image } from "@/components/ui/image";

/**
 * An answer with the admin's own pictures standing in it.
 *
 * Where a word the answer is made of has a picture saved beside it, the picture stands right there at
 * the word — so a word the admin gave a picture to is answered with the picture, and not with the word
 * alone. Nothing is changed about the words themselves: the answer is read exactly as it was written,
 * with the picture set in at its own word.
 */
export default function AnswerText({ text, pictures = [] }) {
  const body = String(text || "");
  const standing = (Array.isArray(pictures) ? pictures : []).filter((pic) => pic?.url && pic?.term);
  if (!body || !standing.length) return body;

  // each picture takes the place of the first time its word is said, one after another
  const parts = [];
  let rest = body;

  standing.forEach((pic) => {
    const term = String(pic.term);
    const at = rest.toLowerCase().indexOf(term.toLowerCase());
    if (at < 0) return;
    parts.push({ read: rest.slice(0, at + term.length) });
    parts.push({ pic });
    rest = rest.slice(at + term.length);
  });

  if (!parts.length) return body;

  return (
    <>
      {parts.map((part, index) =>
        part.pic ? (
          <Image
            key={`picture-${index}`}
            src={part.pic.url}
            alt={part.pic.term}
            className="mx-1 inline-block h-6 w-6 rounded-md border border-border object-cover align-text-bottom"
          />
        ) : (
          <React.Fragment key={`read-${index}`}>{part.read}</React.Fragment>
        )
      )}
      {rest}
    </>
  );
}