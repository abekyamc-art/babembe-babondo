import React from "react";

/**
 * One row of choices in the studio: the same control wherever a setting is set — in the sound
 * column, in the timeline's own head, or in the inspector — so a choice looks the same in all three.
 */
export default function StudioPills({ className = "", options, value, busy, onPick }) {
  return (
    <div className={`rap-pills ${className}`}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          disabled={busy}
          onClick={() => onPick(option.id)}
          className={`rap-pill ${value === option.id ? "is-active" : ""}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}