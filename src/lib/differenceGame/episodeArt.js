import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { SEASONS, episodesIn } from "@/lib/differenceGame/levels";
import { toonSpecOf } from "@/lib/differenceGame/toon/toonLevels";

/**
 * GLOIRE AI — FIND THE DIFFERENCES: the episodes' own pictures.
 *
 * Every cartoon episode used to be drawn from the same set of pieces, so two seasons apart could look
 * alike. Each episode now has one picture of its own, drawn for it alone and kept in the game's own
 * store: the scene as it stands, and the second copy of that same scene with only its own changes made.
 * The places the two copies really differ, read back off them, are kept beside the pictures, so an
 * episode's touch areas stand exactly where its picture changes.
 *
 * What this file does is carry an episode to the drawing: the brief names the episode, its place in the
 * seasons, the light it is played in and the pieces it carries — and nothing else. The words the picture
 * is asked for in are the app's own, made on the other side of the call, so nothing a phone sends can
 * decide what is drawn. An episode whose picture still waits is played on the game's own drawn scene,
 * exactly as before, so the game is whole while the pictures are being made.
 */

/** Every episode of the game that is drawn as a cartoon of its own. */
export const CARTOON_EPISODES = SEASONS.flatMap((season) => episodesIn(season.no)).filter((level) =>
  toonSpecOf(level.scene)
);

/** One episode as the drawing is asked for it: what it is called, where it stands, and what it carries. */
export function briefOf(level) {
  const spec = level ? toonSpecOf(level.scene) : null;
  if (!spec) return null;
  return {
    level: level.id,
    title: level.title,
    setting: spec.setting,
    tone: spec.tone,
    pieces: spec.items.map((item) => item.kind),
  };
}

/** The episode's own picture, or nothing where it has not been drawn yet. */
export async function loadEpisodeArt(levelId) {
  const page = await base44.entities.EpisodeArt.filter({ level_id: levelId }, { limit: 1 });
  return page.items[0] || null;
}

/** The episodes whose own picture already stands. */
export async function drawnEpisodes() {
  const page = await base44.entities.EpisodeArt.filter({}, { fields: ["level_id"], limit: 500 });
  return page.items.map((held) => held.level_id);
}

/** One episode drawn — its two pictures, and the places they really differ read back off them. */
export async function drawEpisode(brief) {
  const answer = await base44.functions.invoke("episodeArt", brief);
  if (answer?.data?.error) throw new Error(answer.data.error);
  return answer.data;
}

/** The pictures of a run of episodes, found by their numbers in one asking. */
export async function artForLevels(ids) {
  if (!ids.length) return {};
  const page = await base44.entities.EpisodeArt.filter({ level_id: { $in: ids } }, { limit: 200 });
  return Object.fromEntries(page.items.map((held) => [held.level_id, held]));
}

/**
 * The pictures of one season's episodes, kept as the season is looked at. Every episode whose own picture
 * already stands is shown by it, and one still waiting is shown by the game's drawn scene, so a season is
 * whole to look at while its pictures are being made.
 */
export function useSeasonArt(levels) {
  const [held, setHeld] = useState({});
  const wanted = levels.filter((level) => toonSpecOf(level.scene)).map((level) => level.id);
  const ids = wanted.join(",");

  useEffect(() => {
    if (!ids) {
      setHeld({});
      return undefined;
    }
    let live = true;
    artForLevels(ids.split(",").map(Number))
      .then((art) => {
        if (live) setHeld(art);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [ids]);

  return held;
}