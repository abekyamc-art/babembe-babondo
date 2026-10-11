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
        await drawEpisode(briefOf(level));
        held.add(level.id);
        made += 1;
        setDone(new Set(held));
      } catch (error) {
        bad.push({
          id: level.id,
          title: level.title,
          reason: error?.message || "The picture could not be drawn.",
        });
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
        <div className="dg-studio-wait">
          <p className="dg-studio-wait-head">Waiting for another run</p>
          {waiting.map((held) => (
            <p key={held.id} className="dg-studio-wait-row">
              {`Episode ${held.id} — ${held.title}: ${held.reason}`}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}