import React, { useState } from "react";
import { Flag } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ReportSheet from "@/components/moderation/ReportSheet";

/**
 * Flagging an answer the app's own AI gave.
 *
 * What the assistant says is the app's own content, and the stores ask that a person may report it as
 * plainly as they report what another person posts. A small mark stands beneath every answer, and a tap
 * opens the very report the rest of the app files — in the reporter's own name, read by an admin.
 *
 * Who is signed in is read only when the mark is tapped, so nothing is asked of the app while an answer
 * is merely being read.
 */
export default function AnswerReport({ text, className = "" }) {
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState(null);
  const [note, setNote] = useState("");

  const start = async () => {
    if (me?.email) {
      setOpen(true);
      return;
    }
    setNote("");
    try {
      const who = await base44.auth.me();
      if (who?.email) {
        setMe(who);
        setOpen(true);
        return;
      }
    } catch (error) {
      // nobody stands signed in on this phone
    }
    setNote("Sign in first — a report is filed in your own name.");
  };

  return (
    <>
      <button
        type="button"
        onClick={start}
        className={`mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground underline decoration-dotted underline-offset-2 ${className}`}
      >
        <Flag className="h-3 w-3" aria-hidden="true" />
        Report this answer
      </button>
      {note ? <p className="mt-1 text-[11px] text-muted-foreground">{note}</p> : null}
      <ReportSheet
        open={open}
        onClose={() => setOpen(false)}
        me={me}
        target={{ contentType: "answer", contentId: "", ownerEmail: "", excerpt: text }}
      />
    </>
  );
}