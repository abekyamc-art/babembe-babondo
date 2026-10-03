import React from "react";

export default function AccountIcon({ label, onClick, size = "md" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`account-icon${size === "lg" ? " account-icon-lg" : ""}`}
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M5.5 19c.8-3.2 3-4.8 6.5-4.8s5.7 1.6 6.5 4.8"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}