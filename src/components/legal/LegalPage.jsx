import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * One legal page — the privacy policy or the terms of use — as it is read inside the app. It is
 * reachable before anyone signs in, which is what the stores ask for, and it closes back to where
 * the person came from.
 */
export default function LegalPage({ title, updated, sections }) {
  const navigate = useNavigate();

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
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
        <h1 className="font-display text-[16px] tracking-tight">{title}</h1>
      </header>

      <article className="mx-auto max-w-md px-5 pt-4">
        <p className="text-[12px] text-muted-foreground">
          Babembe Babondo GS · Last updated {updated}
        </p>

        {sections.map((section) => (
          <section key={section.h} className="mt-6">
            <h2 className="font-heading text-[15px] font-semibold tracking-tight">{section.h}</h2>
            {(section.p || []).map((line) => (
              <p key={line} className="mt-2 text-[13.5px] leading-6 text-muted-foreground">
                {line}
              </p>
            ))}
            {section.list ? (
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13.5px] leading-6 text-muted-foreground">
                {section.list.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </article>
    </div>
  );
}