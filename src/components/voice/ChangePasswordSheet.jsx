import React, { useEffect, useState } from "react";
import { ChevronRight, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { openWindowFor, shutWindow, windowLeftMs } from "@/lib/passwordWindow";

/** "about 2 hours" — how long the door still stands open. */
function leftWords(ms) {
  const minutes = Math.max(0, Math.round(ms / 60000));
  if (minutes >= 60) {
    const hours = Math.round(minutes / 60);
    return `about ${hours} hour${hours === 1 ? "" : "s"}`;
  }
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

const FIELD =
  "h-12 w-full rounded-2xl border border-border bg-background px-4 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * The row that changes a password inside the app, and the form that does it.
 *
 * It stands on the account panel for as long as the door is open for this account — two hours,
 * counted from the first time the panel is opened — and it is gone the moment the password has
 * been changed. The password now standing is asked for and checked by the app's own sign-in, so
 * nobody but the account's owner can change it; nothing that is written here is kept anywhere.
 */
export default function ChangePasswordSheet({ user }) {
  const [row, setRow] = useState(null);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // the door is looked for each time the account panel is opened, so the row is never shown a
  // moment past the two hours, nor after the change has been made
  useEffect(() => {
    if (!user?.email) return undefined;
    let alive = true;
    openWindowFor(user.email)
      .then((standing) => {
        if (alive) setRow(standing);
      })
      .catch(() => {
        if (alive) setRow(null);
      });
    return () => {
      alive = false;
    };
  }, [user?.email]);

  if (!row) return null;

  const close = () => {
    setOpen(false);
    setCurrent("");
    setNext("");
    setAgain("");
    setError("");
    // once the password has been changed the row goes with the panel
    if (done) setRow(null);
  };

  const save = async () => {
    if (busy) return;
    if (next.length < 8) {
      setError("Your new password needs at least 8 characters.");
      return;
    }
    if (next !== again) {
      setError("The two new passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await base44.auth.changePassword({
        userId: user.id,
        currentPassword: current,
        newPassword: next,
      });
      await shutWindow(row);
      setDone(true);
    } catch (err) {
      setError(
        err?.message ||
          "That password was not accepted. Check it and try again."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className="account-action" onClick={() => setOpen(true)}>
        <span className="account-action-label">
          <KeyRound className="h-4 w-4" />
          Change password
        </span>
        <ChevronRight className="account-chevron" aria-hidden="true" />
      </button>

      <Drawer open={open} onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : close())}>
        <DrawerContent className="max-h-[88dvh] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <DrawerHeader className="px-0 pb-3">
            <DrawerTitle className="font-display text-[19px]">
              {done ? "Your password is changed" : "Change your password"}
            </DrawerTitle>
            <DrawerDescription className="text-[13px] leading-relaxed">
              {done
                ? "Sign in with your new password from now on. This door has closed, and it does not open again."
                : `Write your password now and choose the new one. This door stands open for ${leftWords(
                    windowLeftMs(row)
                  )}, then it closes.`}
            </DrawerDescription>
          </DrawerHeader>

          {done ? (
            <div className="flex flex-col gap-2 overflow-y-auto overscroll-contain pb-4">
              <p className="flex items-center gap-2 text-[14px] text-foreground">
                <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" />
                You can sign in with your new password now.
              </p>
              <button
                type="button"
                onClick={close}
                className="mt-1 h-12 w-full rounded-2xl bg-primary text-[14px] font-semibold text-primary-foreground"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 overflow-y-auto overscroll-contain pb-4">
              <label htmlFor="pw-now" className="text-[12px] font-semibold text-muted-foreground">
                Your password now
              </label>
              <input
                id="pw-now"
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(event) => setCurrent(event.target.value)}
                disabled={busy}
                className={FIELD}
              />

              <label htmlFor="pw-new" className="text-[12px] font-semibold text-muted-foreground">
                Your new password
              </label>
              <input
                id="pw-new"
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(event) => setNext(event.target.value)}
                disabled={busy}
                className={FIELD}
              />

              <label htmlFor="pw-again" className="text-[12px] font-semibold text-muted-foreground">
                The new password again
              </label>
              <input
                id="pw-again"
                type="password"
                autoComplete="new-password"
                value={again}
                onChange={(event) => setAgain(event.target.value)}
                disabled={busy}
                className={FIELD}
              />

              {error ? <p className="text-[13px] text-destructive">{error}</p> : null}

              <button
                type="button"
                onClick={save}
                disabled={busy || !current || !next || !again}
                className="mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[14px] font-semibold text-primary-foreground disabled:opacity-40"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                {busy ? "Changing your password…" : "Change my password"}
              </button>
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                Your password now is checked by the app's own sign-in, and nothing you write here is
                kept.
              </p>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}