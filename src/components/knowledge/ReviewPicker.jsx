import React from "react";
import { Check, Loader2 } from "lucide-react";

/**
 * Choosing a whole run of pictures and moving them on in one action.
 *
 * The count of what stands there is named, what is chosen is counted, and the one action says what
 * it does — so nothing moves on without the admin knowing how many pictures it moves.
 */
export default function ReviewPicker({ action, count, chosen, busy, capped, onAll, onClear, onGo }) {
  return (
    <div className="knowledge-pick-bar">
      <button
        type="button"
        onClick={onGo}
        disabled={!chosen || !!busy}
        className="knowledge-pick is-go"
      >
        {busy === "bulk" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
        {action} · {chosen}
      </button>

      <button type="button" onClick={onAll} disabled={!count || !!busy} className="knowledge-pick">
        {capped ? `Choose 100 of ${count}` : `Choose all ${count}`}
      </button>

      <button type="button" onClick={onClear} disabled={!chosen || !!busy} className="knowledge-pick">
        Clear
      </button>

      <span className="knowledge-meter-text">
        {chosen
          ? `${chosen} ${chosen === 1 ? "picture" : "pictures"} chosen`
          : "Nothing chosen yet"}
      </span>

      {capped && chosen ? (
        <span className="knowledge-meter-text">
          One hundred is as many as move at once — move these, then choose the rest.
        </span>
      ) : null}
    </div>
  );
}