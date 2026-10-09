import React from "react";

// where a link stands in a line of an answer: an address written out in full
const URL = /(https?:\/\/[^\s<>()"']+)/g;

/** An address with the punctuation that ended the sentence around it taken off its end. */
const bare = (url) => url.replace(/[),.;!?]+$/, "");

/**
 * The words of an answer with the addresses written inside them standing as links.
 *
 * An answer that gives the artist's own videos writes their addresses out in its own words, and this
 * is what makes those addresses followable: everything else is read exactly as it was written.
 */
export default function TextLinks({ text }) {
  const body = String(text || "");
  if (!body) return null;
  URL.lastIndex = 0;
  if (!URL.test(body)) return body;

  return (
    <>
      {body.split(URL).map((part, index) =>
        index % 2 ? (
          <a
            key={`link-${index}`}
            href={bare(part)}
            target="_blank"
            rel="noreferrer"
            className="break-all text-accent underline decoration-dotted underline-offset-2"
          >
            {part}
          </a>
        ) : (
          <React.Fragment key={`read-${index}`}>{part}</React.Fragment>
        )
      )}
    </>
  );
}