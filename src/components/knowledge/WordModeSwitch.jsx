import React from "react";

const MODES = [
  { id: "one", label: "One word" },
  { id: "list", label: "Paste a list" },
];

/** Which way the words are being added: a single word, or a whole list at once. */
export default function WordModeSwitch({ mode, onPick }) {
  return (
    <div className="knowledge-switch" role="tablist" aria-label="How to add words">
      {MODES.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={mode === item.id}
          onClick={() => onPick(item.id)}
          className={`knowledge-tab${mode === item.id ? " is-active" : ""}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}