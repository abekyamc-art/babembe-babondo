import React, { useState } from "react";
import { ChevronRight, Loader2, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** The one row that ends an account, and the question asked before it does. */
export default function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await base44.functions.invoke("deleteAccount", {});
      if (res?.data?.error) throw new Error(res.data.error);
      // nothing of the account is left behind on the phone: its stored keys and tokens go with it
      window.localStorage.clear();
      window.sessionStorage.clear();
      // the account is gone, so the app opens again at its first screen
      await base44.auth.logout("/");
    } catch (err) {
      setError("Could not delete your account. Please try again.");
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="account-action account-action-danger"
        onClick={() => setOpen(true)}
      >
        <span className="account-action-label">
          <Trash2 className="h-4 w-4" />
          Delete account
        </span>
        <ChevronRight className="account-chevron" />
      </button>

      <AlertDialog open={open} onOpenChange={(next) => (!busy ? setOpen(next) : null)}>
        <AlertDialogContent className="max-w-sm rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              Your profile and coin balance, your voice recordings, and all your account history — your
              conversations, exam progress, songs, reels and comments — are permanently deleted, and you
              are signed out. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? <p className="text-[14px] text-destructive">{error}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11" disabled={busy}>
              Keep my account
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                remove();
              }}
              className="h-11 gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}