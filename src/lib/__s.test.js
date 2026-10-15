import { it } from "vitest";
import { EXAM_SEASONS, episodesInSeason, buildEpisodePaper } from "@/lib/examSeasons";
it("sizes", () => {
  const rows = EXAM_SEASONS.map((s) => `${s.no}: ${episodesInSeason(s.no)} (pool ${s.pool})`);
  const people = [];
  for (const [s, e] of [[5, 1], [5, 90], [5, 96], [5, 97], [5, 98]]) people.push(`5/${e}: ${buildEpisodePaper(s, e).length}`);
  console.log(rows.join("\n"), "\n", people.join("\n"));
});
