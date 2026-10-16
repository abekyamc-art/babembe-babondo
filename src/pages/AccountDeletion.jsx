import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { deleteMyAccount } from "@/lib/deleteAccount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import usePageMeta from "@/lib/pageMeta";

/**
 * The web page for deleting an account.
 *
 * The app stores ask an app that lets people sign up to offer account deletion on the web as well as
 * inside the app, at an address anyone can open without installing anything. This is that address: it
 * says how deletion is done, and — signed in with the same account — it does it, once the person has
 * plainly asked for it by typing the word.
 */
const CONFIRM_WORD = "DELETE";

export default function AccountDeletion() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [checked, setChecked] = useState(false);
  const [word, setWord] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  usePageMeta({
    title: "Delete your account — Babembe Babondo GS",
    description:
      "How to delete your Babembe Babondo GS account and everything it holds, inside the app or here on the web.",
  });

  useEffect(() => {
    let alive = true;
    base44.auth
      .me()
      .then((user) => {
        if (alive) setMe(user);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setChecked(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const remove = async () => {
    if (busy || word.trim().toUpperCase() !== CONFIRM_WORD) return;
    setBusy(true);
    setError("");
    try {
      await deleteMyAccount();
    } catch (err) {
      setError("Your account could not be deleted just now. Please try again.");
      setBusy(false);
    }
  };

  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate("/"));

  const signIn = () => {
    window.location.href = `/login?returnTo=${encodeURIComponent("/delete-account")}`;
  };

  return (
    <div className="min-h-full bg-background pb-16 text-foreground">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background/95 px-4 pb-2 pt-[max(0.6rem,env(safe-area-inset-top))] backdrop-blur">
        <button
          type="button"
          onClick={goBack}
          aria-label="Back"
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/70"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="font-display text-[16px] tracking-tight">Delete your account</h1>
      </header>

      <article className="mx-auto max-w-md px-5 pt-4">
        <p className="text-[12px] text-muted-foreground">Babembe Babondo GS</p>

        <section className="mt-5">
          <h2 className="font-heading text-[15px] font-semibold tracking-tight">Inside the app</h2>
          <p className="mt-2 text-[13.5px] leading-6 text-muted-foreground">
            Open the account panel on the home screen, or your own profile page, and choose Delete
            account. It asks you to confirm first.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="font-heading text-[15px] font-semibold tracking-tight">Here on the web</h2>
          <p className="mt-2 text-[13.5px] leading-6 text-muted-foreground">
            Sign in with the same Google account you use in the app, type the word below, and your account
            and everything it holds are deleted.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border border-border bg-card p-4">
          {!checked ? (
            <p className="flex items-center gap-2 text-[13.5px] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking your sign-in…
            </p>
          ) : me ? (
            <>
              <p className="text-[13.5px] text-muted-foreground">
                Signed in as <span className="text-foreground">{me.email}</span>
              </p>
              <label
                htmlFor="confirm-word"
                className="mt-3 block text-[11px] font-bold uppercase tracking-[1.4px] text-muted-foreground"
              >
                Type {CONFIRM_WORD} to confirm
              </label>
              <Input
                id="confirm-word"
                value={word}
                onChange={(event) => setWord(event.target.value)}
                placeholder={CONFIRM_WORD}
                autoCapitalize="characters"
                autoComplete="off"
                className="mt-2 h-11"
              />
              {error ? <p className="mt-2 text-[13px] text-destructive">{error}</p> : null}
              <Button
                variant="destructive"
                className="mt-3 h-11 w-full gap-2 rounded-full"
                disabled={busy || word.trim().toUpperCase() !== CONFIRM_WORD}
                onClick={remove}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete my account
              </Button>
            </>
          ) : (
            <>
              <p className="text-[13.5px] text-muted-foreground">
                You are not signed in on this page. Sign in with the account you want deleted.
              </p>
              <Button className="mt-3 h-11 w-full rounded-full" onClick={signIn}>
                Sign in to delete my account
              </Button>
            </>
          )}
        </section>

        <section className="mt-6">
          <h2 className="font-heading text-[15px] font-semibold tracking-tight">What is removed</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13.5px] leading-6 text-muted-foreground">
            <li>Your profile, your username, your picture and your coin balance.</li>
            <li>Your voice recordings and the words they teach the app.</li>
            <li>Your conversations, your examination progress and your game progress on our side.</li>
            <li>Your songs, videos, comments, likes and follows.</li>
          </ul>
          <p className="mt-3 text-[13.5px] leading-6 text-muted-foreground">
            Deleting your account cannot be undone. Copies may remain for a short time in our service
            providers' backups before they are cleared.
          </p>
        </section>

        <p className="mt-6 text-[12.5px] text-muted-foreground">
          <Link to="/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>
          <span className="px-2">·</span>
          <Link to="/terms" className="underline underline-offset-2">
            Terms of use
          </Link>
        </p>
      </article>
    </div>
  );
}