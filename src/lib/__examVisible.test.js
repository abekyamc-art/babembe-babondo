import { describe, it, expect } from "vitest";
import { EXAM_SEASONS, seasonShown, episodesInSeason } from "./examSeasons";
import { examCoverOf } from "./examSeasonCovers";
import { trophyOf } from "./examTrophies";
import { rewardOf } from "./examRewards";

// the seasons the shelf shows a cup for, exactly as the prize shelf reads them
const shelf = EXAM_SEASONS.filter((season) => !season.waiting).map((season) => season.no);

describe("every season and every trophy stands open to everyone", () => {
  it("a student is met with all eleven seasons", () => {
    const shown = EXAM_SEASONS.filter((season) => seasonShown(season.no, false));
    expect(shown.map((season) => season.no)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it("an admin, too", () => {
    const shown = EXAM_SEASONS.filter((season) => seasonShown(season.no, true));
    expect(shown.length).toBe(11);
  });

  it("every season has its own cover, cup and code", () => {
    expect(shelf.length).toBe(11);
    shelf.forEach((no) => {
      expect(examCoverOf(no), `cover ${no}`).toBeTruthy();
      expect(trophyOf(no), `trophy ${no}`).toBeTruthy();
      expect(rewardOf(no), `code ${no}`).toBeTruthy();
      expect(episodesInSeason(no), `episodes ${no}`).toBeGreaterThanOrEqual(98);
    });
  });

  it("the season after each one is still opened by clearing the one before it", () => {
    expect(shelf.slice(1)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });
});