import React, { useEffect, useState } from "react";
import { ChevronRight, KeyRound, Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { openWindowFor, shutWindow, windowLeftMs } from "@/lib/passwordWindow";
import { resolveLoginEmail } from "@/lib/loginAlias";

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
 * The row that changes the account's password, and the ways it is done.
 *
 * The new password is never written here against an old one: the app's own link is sent to the
 * account's address, and the password is chosen on the screen that link opens — so neither spelling
 * of the address has a password of its own, and the one that is set answers both. There is only ever
 * one password, and the same one opens either spelling.
 *
 * The password now standing is asked for only down the second way, which the app's own sign-in alone
 * accepts, for a person who already knows it and would rather not wait for a letter.
 *
 * The row stands on the panel only while the door is open for this account, two hours counted from
 * the first time the panel is opened, and it is gone the moment the password has been changed.
 */
export default function ChangePasswordSheet({ user }) {
  const [row, setRow] = useState(null);
  const [open, setOpen] = useState(false);
  const [knowIt, setKnowIt] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // The address the link is sent to is the account's own, whichever spelling is written on the panel:
  // the letter is written for the account, not for the way its owner happens to type it.
  const account = resolveLoginEmail(user?.email);

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
    setKnowIt(false);
    setCurrent("");
    setNext("");
    setAgain("");
    setSentTo("");
    setError("");
    // once the password has been changed the row goes with the panel
    if (done) setRow(null);
  };

  /** The link that opens the app's own screen for a new password. No old password is asked for. */
  const sendLink = async () => {
    if (busy || !account) return;
    setBusy(true);
    setError("");
    try {
      await base44.auth.resetPasswordRequest(account);
      setSentTo(account);
    } catch (err) {
      setError(err?.message || "The link could not be sent just now. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  /** The second way: the password now standing is checked by the app's own sign-in as it changes. */
  const saveNow = async () => {
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
      setError(err?.message || "That password was not accepted. Check it and try again.");
    } finally {
      setBusy(false);
    }
  };

  const title = done
    ? "Your password is changed"
    : sentTo
      ? "The link is on its way"
      : "Choose a new password";

  const words = done
    ? "Sign in with your new password from now on. This door has closed, and it does not open again."
    : sentTo
      ? `Open the link sent to ${sentTo} and write your new password there. Either spelling of your address signs in with it.`
      : `This door stands open for ${leftWords(windowLeftMs(row))}, then it closes. The link sent to your own address opens this app's screen for the new password, where the one you have now is not asked for.`;

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
            <DrawerTitle className="font-display text-[19px]">{title}</DrawerTitle>
            <DrawerDescription className="text-[13px] leading-relaxed">{words}</DrawerDescription>
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
          ) : sentTo ? (
            <div className="flex flex-col gap-3 overflow-y-auto overscroll-contain pb-4">
              <p className="flex items-center gap-2 text-[14px] text-foreground">
                <MailCheck className="h-4 w-4 text-accent" aria-hidden="true" />
                {sentTo}
              </p>
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                Nothing has to be typed here. Open the link and write the new password there: it is set
                for the account, so either spelling signs in with it. If it has not come in a few
                minutes, look in the junk folder.
              </p>
              {error ? <p className="text-[13px] text-destructive">{error}</p> : null}
              <button
                type="button"
                onClick={sendLink}
                disabled={busy}
                className="mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[14px] font-semibold text-primary-foreground disabled:opacity-40"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                {busy ? "Sending again…" : "Send the link again"}
              </button>
              <button type="button" onClick={close} className="h-11 text-[13px] font-semibold text-muted-foreground">
                Close
              </button>
            </div>
          ) : knowIt ? (
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
                onClick={saveNow}
                disabled={busy || !current || !next || !again}
                className="mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[14px] font-semibold text-primary-foreground disabled:opacity-40"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                {busy ? "Changing your password…" : "Change my password now"}
              </button>
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                Nothing but the app's own sign-in reads the password you have now, and nothing written
                here is kept.
              </p>
              <button
                type="button"
                onClick={() => {
                  setKnowIt(false);
                  setError("");
                }}
                className="h-11 text-[13px] font-semibold text-muted-foreground"
              >
                Send me the link instead
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 overflow-y-auto overscroll-contain pb-4">
              <button
                type="button"
                onClick={sendLink}
                disabled={busy || !account}
                className="mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[14px] font-semibold text-primary-foreground disabled:opacity-40"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                {busy ? "Sending the link…" : `Send the link to ${account}`}
              </button>
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                No password is written here and none has to be remembered: the link opens this app's own
                screen, where the new password is written once for the whole account.
              </p>
              {error ? <p className="text-[13px] text-destructive">{error}</p> : null}
              <button
                type="button"
                onClick={() => setKnowIt(true)}
                className="h-11 text-[13px] font-semibold text-muted-foreground"
              >
                I know my password now
              </button>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}