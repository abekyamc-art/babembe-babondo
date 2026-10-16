import React, { useState } from "react";
import { Check, Loader2, ShieldAlert } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CONTENT_LABELS, REPORT_REASONS, fileReport } from "@/lib/moderation";
import { cn } from "@/lib/utils";

/** Filing one report: why, and anything more the person wants to add. */
export default function ReportSheet({ open, onClose, target, me, onDone }) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState("");

  const kind = CONTENT_LABELS[target?.contentType] || "content";

  const close = () => {
    setReason("");
    setNote("");
    setProblem("");
    onClose();
  };

  const send = async () => {
    if (!reason || sending || !me?.email) return;
    setSending(true);
    setProblem("");
    try {
      await fileReport({
        reporterEmail: me.email,
        contentType: target.contentType,
        contentId: target.contentId,
        ownerEmail: target.ownerEmail,
        excerpt: target.excerpt,
        reason,
        note,
      });
      close();
      onDone?.();
    } catch (error) {
      setProblem("That report did not go through. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(next) => (next ? null : close())}>
      <DrawerContent className="max-h-[88vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2 font-display text-[18px] tracking-tight">
            <ShieldAlert className="h-4 w-4" />
            Report this {kind}
          </DrawerTitle>
          <DrawerDescription className="text-[12.5px]">
            Your report is kept private, and an admin reads it. The person is not told who reported
            them.
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 overflow-y-auto px-4 pb-6">
          <div className="space-y-2">
            {REPORT_REASONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setReason(option.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-[13.5px]",
                  reason === option.id
                    ? "border-accent bg-accent/10 text-foreground"
                    : "border-border bg-card text-muted-foreground"
                )}
              >
                {option.label}
                {reason === option.id ? <Check className="h-4 w-4 shrink-0 text-accent" /> : null}
              </button>
            ))}
          </div>

          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Anything more you want to say (optional)"
            aria-label="More about this report"
            className="min-h-[84px] text-[13.5px]"
          />

          {problem ? <p className="text-[12px] text-destructive">{problem}</p> : null}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={close} disabled={sending}>
              Cancel
            </Button>
            <Button className="flex-1 gap-2" onClick={send} disabled={!reason || sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Send report
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}