import React, { useEffect, useRef, useState } from "react";
import { Loader, Palette, Square } from "lucide-react";
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

/**
 * How many episodes are drawn at the same time. Drawing the whole game one episode after another took
 * hours, so a few are drawn together — quick enough to finish the game, and few enough that the accounts
 * the pictures come from are never swamped.
 */
const PARALLEL = 4;
export default function ArtStudio() {
  const [admin, setAdmin] = useState(false);
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState("");
  const [waiting, setWaiting] = useState([]);
  // how many episodes are being drawn at this very moment, and how many this run has drawn, so a long run
  // shows its place
  const [active, setActive] = useState(0);
  const [madeNow, setMadeNow] = useState(0);
  // a run is stopped by the admin, and it stops where it stands rather than losing what it has drawn
  const stop = useRef(false);

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
    if (busy) return;
    stop.current = false;
    setBusy(true);
    setWaiting([]);
    setSaid("");
    setMadeNow(0);
    setActive(0);
    const held = new Set(done);
    const bad = [];
    const queue = [...left];
    let next = 0;
    let started = 0;
    let made = 0;

    // The next episode no one has taken yet: a whole run takes every one of them, a short run only as many
    // as it was asked for, and nothing more is taken once the run is stopped. A short run also gives up
    // after a few failures; a whole run goes on, because a few episodes that will not draw must never stop
    // the rest of the game from being drawn.
    const claim = () => {
      if (stop.current || started >= howMany || next >= queue.length) return null;
      if (Number.isFinite(howMany) && bad.length >= 3) return null;
      const level = queue[next];
      next += 1;
      started += 1;
      return level;
    };

    // One worker draws one episode at a time, and four of them draw together. Every picture is written down
    // the moment it is drawn, so a run taken up again goes on from where it stopped and never draws an
    // episode that already stands. An episode that will not draw is named here and left where it is: it
    // waits for another run instead of holding back the hundreds behind it.
    const worker = async () => {
      for (let level = claim(); level; level = claim()) {
        setActive((drawing) => drawing + 1);
        try {
          await drawEpisode(briefOf(level));
          held.add(level.id);
          made += 1;
          setMadeNow(made);
          setDone(new Set(held));
        } catch (error) {
          bad.push({
            id: level.id,
            title: level.title,
            reason: error?.message || "The picture could not be drawn.",
          });
          setWaiting([...bad]);
        }
        setActive((drawing) => drawing - 1);
      }
    };

    await Promise.all(Array.from({ length: PARALLEL }, worker));

    const wasStopped = stop.current;
    setActive(0);
    setSaid(
      made
        ? `${made} episode picture${made === 1 ? "" : "s"} drawn this run. ${held.size} of ${CARTOON_EPISODES.length} stand.${
            bad.length ? ` ${bad.length} waited for another run.` : ""
          }`
        : wasStopped
          ? `The run was stopped. ${held.size} of ${CARTOON_EPISODES.length} stand.`
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
        <button
          type="button"
          className="dg-switch"
          onClick={() => run(Infinity)}
          disabled={busy || !left.length}
        >
          {`Draw all the rest (${left.length})`}
        </button>
        {busy ? (
          <button
            type="button"
            className="dg-switch"
            onClick={() => {
              stop.current = true;
            }}
          >
            <Square aria-hidden="true" />
            Stop
          </button>
        ) : null}
      </div>
      {busy ? (
        <p className="dg-note" role="status">
          {`Drawing ${active || PARALLEL} at a time — ${madeNow} drawn this run, ${done.size} of ${CARTOON_EPISODES.length} stand.`}
        </p>
      ) : said ? (
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