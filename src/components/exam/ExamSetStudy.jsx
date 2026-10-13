import React from "react";
import { setById } from "@/lib/examSets";
import "@/exam-set.css";

/**
 * The teaching set a season's papers are cut from, read before it is asked: the lesson exactly as it was
 * taught — the Kibembe form, the Kiswahili it was taught under and the English where the lesson gave one
 * — with the rules the lesson was written by, and the notes it came with.
 *
 * It stands folded away at the head of the season's own page, so the season is met first and the lesson
 * itself is opened when it is wanted.
 */
export default function ExamSetStudy({ setId }) {
  const set = setById(setId);
  if (!set) return null;
  const pairs = set.sections.reduce((sum, section) => sum + section.rows.length, 0);

  return (
    <details className="exam-set">
      <summary className="exam-set-open">
        <span className="exam-set-open-title">Study the teaching set — {set.title}</span>
        <span className="exam-set-open-meta">
          {set.taught_on} · {pairs} pairs
        </span>
      </summary>

      <div className="exam-set-body">
        <p className="exam-set-source">{set.source}</p>
        {set.note ? <p className="exam-set-note">{set.note}</p> : null}

        {set.rules?.length ? (
          <ul className="exam-set-rules">
            {set.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        ) : null}

        {set.sections.map((section) => (
          <section className="exam-set-part" key={section.title}>
            <h4 className="exam-set-part-title">
              {section.title}
              {section.label && section.label !== section.title ? ` · ${section.label}` : ""}
            </h4>
            {section.rows.map((row, at) => (
              <p className="exam-set-row" key={`${row.kb}-${at}`}>
                <span className="exam-set-kb">{row.kb}</span>
                <span className="exam-set-sw">{row.sw}</span>
                {row.en && row.en !== row.sw ? (
                  <span className="exam-set-en">{row.en}</span>
                ) : null}
              </p>
            ))}
          </section>
        ))}

        {set.asides?.map((aside) => (
          <p className="exam-set-aside" key={aside.title}>
            <span className="exam-set-aside-title">{aside.title}</span>
            {aside.text}
          </p>
        ))}
      </div>
    </details>
  );
}