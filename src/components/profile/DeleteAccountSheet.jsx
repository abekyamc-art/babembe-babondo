import React, { useState } from "react";
import { ChevronRight, Loader2, Trash2 } from "lucide-react";
import { deleteMyAccount } from "@/lib/deleteAccount";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

/** The word the person must write out before their account is ended. */
const WORD = "DELETE";

/**
 * The row that ends an account, on the person's own profile page, and the question asked before it does.
 *
 * The question slides up from the bottom of the screen and says plainly what goes: the account and
 * everything standing on it, for good. Nothing is deleted on a tap alone — the person writes the word
 * out themselves first, so an account is never ended by a thumb meeting the wrong row.
 */
export default function DeleteAccountSheet() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ready = typed.trim().toUpperCase() === WORD;

  const remove = async () => {
    if (busy || !ready) return;
    setBusy(true);
    setError("");
    try {
      await deleteMyAccount();
    } catch (err) {
      setError("Could not delete your account. Please try again.");
      setBusy(false);
    }
  };

  return (
    <>
      <div className="account-actions border-border">
        <button
          type="button"
          className="account-action account-action-danger text-destructive hover:text-destructive"
          onClick={() => {
            setTyped("");
            setError("");
            setOpen(true);
          }}
        >
          <span className="account-action-label">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete account
          </span>
          <ChevronRight className="account-chevron text-muted-foreground" aria-hidden="true" />
        </button>
      </div>

      <Drawer open={open} onOpenChange={(next) => (!busy ? setOpen(next) : null)}>
        <DrawerContent className="max-h-[88dvh] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <DrawerHeader className="px-0 pb-3">
            <DrawerTitle className="font-display text-[19px]">Delete your account?</DrawerTitle>
            <DrawerDescription className="text-[13px] leading-relaxed">
              Your profile and coin balance, your voice recordings, and all your account history — your
              conversations, exam progress, songs, reels and comments — are permanently deleted, and you
              are signed out. This cannot be undone.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex flex-col gap-2 overflow-y-auto overscroll-contain pb-4">
            <label
              htmlFor="delete-account-word"
              className="text-[12px] font-semibold text-muted-foreground"
            >
              {`Type ${WORD} to confirm`}
            </label>
            <input
              id="delete-account-word"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              placeholder={WORD}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              disabled={busy}
              className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-[15px] tracking-[0.12em] uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />

            {error ? <p className="text-[13px] text-destructive">{error}</p> : null}

            <button
              type="button"
              onClick={remove}
              disabled={busy || !ready}
              className="mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-destructive text-[14px] font-semibold text-destructive-foreground disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              {busy ? "Deleting your account…" : "Delete my account for good"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={busy}
              className="h-12 w-full rounded-2xl border border-border bg-card text-[14px] font-semibold disabled:opacity-40"
            >
              Keep my account
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}