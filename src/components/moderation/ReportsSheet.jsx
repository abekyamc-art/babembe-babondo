import React, { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Check, Loader2, ShieldAlert, Trash2 } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { CONTENT_LABELS, reasonLabel } from "@/lib/moderation";

/** Everything that has been reported, in the admins' own hands: read it, close it, take it down. */
export default function ReportsSheet({ open, onClose }) {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const page = await base44.entities.Report.filter(
      { status: "open" },
      { sort: "-created_date", limit: 60 }
    );
    setRows(page?.items || []);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    setLoading(true);
    load().finally(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [open, load]);

  const close_ = async (report) => {
    setBusy(report.id);
    try {
      await base44.entities.Report.update(report.id, { status: "reviewed" });
      setRows((prev) => prev.filter((row) => row.id !== report.id));
    } finally {
      setBusy("");
    }
  };

  const takeDown = async (report) => {
    setBusy(report.id);
    try {
      if (report.content_type === "reel" && report.content_id) {
        await base44.entities.Reel.delete(report.content_id).catch(() => null);
      }
      if (report.content_type === "comment" && report.content_id) {
        await base44.entities.ReelComment.delete(report.content_id).catch(() => null);
      }
      await base44.entities.Report.update(report.id, { status: "reviewed" });
      setRows((prev) => prev.filter((row) => row.id !== report.id));
      toast({ title: "Taken down", description: "The report is closed." });
    } finally {
      setBusy("");
    }
  };

  return (
    <Drawer open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DrawerContent className="max-h-[88vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2 font-display text-[18px] tracking-tight">
            <ShieldAlert className="h-4 w-4" />
            Reports
          </DrawerTitle>
          <DrawerDescription className="text-[12.5px]">
            What people have reported, newest first. Reports already read are not shown.
          </DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length ? (
            <ul className="space-y-2.5">
              {rows.map((report) => (
                <li key={report.id} className="rounded-2xl border border-border bg-card p-3.5">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {reasonLabel(report.reason)} · {CONTENT_LABELS[report.content_type] || report.content_type}
                  </p>
                  <p className="mt-1 text-[13.5px]">
                    @{(report.content_owner_email || "").split("@")[0] || "unknown"}
                    <span className="text-muted-foreground">
                      {" "}
                      · reported by @{(report.reporter_email || "").split("@")[0]}
                    </span>
                  </p>
                  {report.excerpt ? (
                    <p className="mt-1.5 line-clamp-3 text-[13px] text-muted-foreground">
                      “{report.excerpt}”
                    </p>
                  ) : null}
                  {report.note ? (
                    <p className="mt-1.5 text-[13px] text-muted-foreground">{report.note}</p>
                  ) : null}
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {report.at ? formatDistanceToNow(new Date(report.at), { addSuffix: true }) : ""}
                  </p>
                  <div className="mt-2.5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => close_(report)}
                      disabled={busy === report.id}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border px-3 py-2 text-[12px] font-semibold"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Close it
                    </button>
                    {["reel", "comment"].includes(report.content_type) && report.content_id ? (
                      <button
                        type="button"
                        onClick={() => takeDown(report)}
                        disabled={busy === report.id}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-destructive px-3 py-2 text-[12px] font-semibold text-destructive-foreground"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Take it down
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-[13px] text-muted-foreground">
              Nothing has been reported.
            </p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}