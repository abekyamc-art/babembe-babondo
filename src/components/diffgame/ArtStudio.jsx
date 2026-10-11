import React, { useEffect, useState } from "react";
import { Loader, Palette } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { CARTOON_EPISODES, briefOf, drawEpisode, drawnEpisodes } from "@/lib/differenceGame/episodeArt";
import "@/art-studio.css";

/**
 * The admin's own corner of the game: the episodes' pictures drawn, one episode at a time.
 *
 * Every cartoon episode carries a picture of its own, and each one is drawn on the app's own accounts —
 * so they are made a few at a time rather than all at once, and a run can be stopped and taken up again
 * wherever it stands. Only an admin sees this corner at all; a player never meets it.
 *
 * An episode whose picture comes back short is left standing where it was and named here, so a run goes
 * on past it and it waits for the next run instead of holding the rest back.
 */
export default function ArtStudio() {
  const [admin, setAdmin] = useState(false);
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState("");
  const [waiting, setWaiting] = useState([]);

  const count = async () => setDone(new Set(await drawnEpisodes()));

  useEffect(() => {
    let live = true;
    base44.auth
      .me()
      .then((user) => {
        if (!live || user?.role !== "admin") return;
        setAdmin(true);
        count().catch(() => setDone(new Set()));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  if (!admin || !done) return null;

  const left = CARTOON_EPISODES.filter((level) => !done.has(level.id));

  const run = async (howMany) => {
    setBusy(true);
    setWaiting([]);
    const held = new Set(done);
    const bad = [];
    let made = 0;
    let tried = 0;

    // one episode at a time, so the accounts are asked gently and a run can be stopped at any point
    for (const level of left) {
      if (made >= howMany || tried >= howMany + 3) break;
      tried += 1;
      setSaid(`Drawing episode ${level.id} — ${level.title}…`);
      try {
        const answer = await drawEpisode(briefOf(level));
        held.add(level.id);
        made += 1;
        setDone(new Set(held));
        // a pair the app drew itself is paid for out of the app's own credits, so a run never carries on
        // past it: the drawing accounts are spent, and they are left to come back of themselves
        if (answer?.by === "own") {
          setSaid(
            `Episode ${level.id} was drawn by the app's own picture service — the drawing accounts are spent. ` +
              "Run again once your Gemini image allowance is back."
          );
          setBusy(false);
          return;
        }
      } catch {
        bad.push(level.id);
        setWaiting([...bad]);
      }
    }

    setSaid(
      made
        ? `${made} episode picture${made === 1 ? "" : "s"} drawn. ${held.size} of ${CARTOON_EPISODES.length} stand.`
        : "Nothing was drawn this time — the accounts may need a while before the next run."
    );
    setBusy(false);
  };

  return (
    <section className="dg-studio">
      <p className="dg-studio-head">
        <Palette aria-hidden="true" />
        Episode pictures
      </p>
      <p className="dg-note">
        {`${done.size} of ${CARTOON_EPISODES.length} episodes have a cartoon picture of their own. `}
        {left.length
          ? "A run draws a few at a time; the rest keep the game's drawn scene until their own picture is made."
          : "Every episode stands with its own picture."}
      </p>
      <div className="dg-switches">
        <button
          type="button"
          className="dg-switch"
          onClick={() => run(1)}
          disabled={busy || !left.length}
        >
          {busy ? <Loader aria-hidden="true" /> : null}
          Draw the next episode
        </button>
        <button
          type="button"
          className="dg-switch"
          onClick={() => run(5)}
          disabled={busy || !left.length}
        >
          Draw the next five
        </button>
      </div>
      {said ? (
        <p className="dg-note" role="status">
          {said}
        </p>
      ) : null}
      {waiting.length ? (
        <p className="dg-studio-wait">
          Waiting for another run: {waiting.join(", ")}
        </p>
      ) : null}
    </section>
  );
}