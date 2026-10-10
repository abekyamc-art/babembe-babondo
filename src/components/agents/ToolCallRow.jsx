import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

const DONE = ["completed", "success"];
const FAILED = ["failed", "error"];
const RUNNING = ["pending", "running", "in_progress"];

const read = (value, fallback) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch (err) {
    return String(value);
  }
};

const show = (value) => (typeof value === "string" ? value : JSON.stringify(value, null, 1));

/**
 * One thing the companion did: what it is called, how far it has come, and — a tap away — what it was
 * asked and what it gave back. Where the app asks for the details to be hidden, only the state is
 * shown, so nothing of a private result is ever put on the screen.
 */
export default function ToolCallRow({ call }) {
  const [open, setOpen] = useState(false);
  const results = read(call.results, null);
  const failed =
    FAILED.includes(call.status) ||
    (typeof results === "string" && /error|failed/i.test(results)) ||
    (results && typeof results === "object" && results.success === false);
  const running = RUNNING.includes(call.status) && !DONE.includes(call.status);
  const projection = call.display_projection || {};
  const hidden = projection.hide_details && projection.details_redacted;
  const state = failed
    ? projection.error_label || "failed"
    : running
      ? projection.active_label || "working"
      : projection.label || "done";

  return (
    <div className="text-[11px]">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 text-left text-muted-foreground"
      >
        {failed ? (
          <AlertTriangle className="h-3.5 w-3.5 flex-none text-destructive" />
        ) : running ? (
          <Loader2 className="h-3.5 w-3.5 flex-none animate-spin" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 flex-none text-accent" />
        )}
        <span className="truncate">{call.name}</span>
        <span className="flex-none text-muted-foreground">{state}</span>
      </button>
      {open && !hidden ? (
        <div className="mt-1 space-y-1 rounded-lg border border-border bg-muted/50 px-2 py-1.5 font-mono text-[10px] break-words text-muted-foreground">
          {call.arguments_string ? (
            <p className="whitespace-pre-wrap">{show(read(call.arguments_string, call.arguments_string))}</p>
          ) : null}
          {results === null ? null : <p className="whitespace-pre-wrap">{show(results)}</p>}
        </div>
      ) : null}
    </div>
  );
}