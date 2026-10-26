import { buildTopUp } from "./examTopUp";
import { episodeIdea } from "./examThemes";

/**
 * GLOIRE AI — THE EXAMINATION: the papers of the seasons of ideas.
 *
 * A season of ideas asks the app's own confirmed words, exactly as the word seasons do, and nothing here
 * writes a word of the language. What it adds is the episode's own idea: a paper is cut from the
 * confirmed bank in an order kept for that season alone, so no two seasons of ideas meet the bank in the
 * same places, and it steps nine questions on for each episode, so the papers beside each other never ask
 * the same word — a word only comes back once the whole bank has been round.
 *
 * The tenth seat of every paper is the picture puzzle, which the examination's own paper builder puts
 * there. A phone that could not read the document is served the examination's own written banks by the
 * top-up, so a paper is never left standing short.
 */

/** How many questions of a paper this season's own run fills; the tenth seat is the picture puzzle. */
const PER_PAPER = 9;

/** One episode's paper: its own run of the confirmed words, under its own idea. */
export function buildTopicPaper(seasonNo, episode) {
  const idea = episodeIdea(seasonNo, episode);
  const paper = buildTopUp(PER_PAPER, `topic:${seasonNo}`, episode, [], "en");
  // the idea stands over every question of the paper, so what the episode is met under is read all the
  // way through it and not only at its head
  if (!idea) return paper;
  return paper.map((question) => ({ ...question, idea, focus: question.focus || idea }));
}