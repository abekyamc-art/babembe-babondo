import React, { useEffect, useState } from "react";
import { Loader2, Undo2 } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { base44 } from "@/api/base44Client";
import { blockedEmails, unblockPerson } from "@/lib/moderation";

/** Everybody this person has kept out of their way, with the one tap that lets them back in. */
export default function BlockedSheet({ open, onClose, me, onChanged }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (!open || !me?.email) return undefined;
    let alive = true;
    setLoading(true);
    (async () => {
      const emails = await blockedEmails(me.email);
      const found = emails.length
        ? await base44.entities.Profile.filter({ user_email: { $in: emails } }, { limit: 200 })
        : { items: [] };
      const byEmail = Object.fromEntries(
        (found?.items || []).map((person) => [person.user_email, person.username])
      );
      if (!alive) return;
      setRows(emails.map((email) => ({ email, username: byEmail[email] || email.split("@")[0] })));
    })().finally(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [open, me]);

  const release = async (email) => {
    setBusy(email);
    try {
      await unblockPerson(me.email, email);
      setRows((prev) => prev.filter((row) => row.email !== email));
      onChanged?.(email, false);
    } finally {
      setBusy("");
    }
  };

  return (
    <Drawer open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="font-display text-[18px] tracking-tight">Blocked accounts</DrawerTitle>
          <DrawerDescription className="text-[12.5px]">
            You do not see their reels, their messages or their profile while they are here.
          </DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length ? (
            <ul className="divide-y divide-border">
              {rows.map((row) => (
                <li key={row.email} className="flex items-center justify-between gap-3 py-3">
                  <span className="min-w-0 truncate text-[14px] font-medium">@{row.username}</span>
                  <button
                    type="button"
                    onClick={() => release(row.email)}
                    disabled={busy === row.email}
                    className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12px] font-semibold"
                  >
                    {busy === row.email ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Undo2 className="h-3.5 w-3.5" />
                    )}
                    Unblock
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-[13px] text-muted-foreground">
              You have not blocked anyone.
            </p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}