import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MessageSquarePlus } from "lucide-react";
import { GLOIRE_AI } from "@/lib/providerNames";

/** The companion screen's own head: who is answering, and the way back to the Kibembe assistant. */
export default function CompanionHeader({ onRestart }) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
      <Link
        to="/kibembe"
        aria-label="Back to the Kibembe assistant"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-foreground"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <div className="min-w-0">
        <h1 className="truncate font-heading text-lg leading-tight text-foreground">
          {GLOIRE_AI} — Kibembe Companion
        </h1>
        <p className="truncate font-body text-xs text-muted-foreground">
          Kibembe, Kiswahili, English — one talk
        </p>
      </div>
      <button
        type="button"
        onClick={onRestart}
        aria-label="Start a new conversation"
        className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-foreground"
      >
        <MessageSquarePlus className="h-4 w-4" />
      </button>
    </header>
  );
}