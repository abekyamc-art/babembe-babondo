import React from "react";
import VillageScene from "./VillageScene";
import MarketScene from "./MarketScene";
import ClassroomScene from "./ClassroomScene";

/** Which drawing belongs to which scene name. */
const SCENES = {
  village: VillageScene,
  market: MarketScene,
  classroom: ClassroomScene,
};

/**
 * One picture of a level. Both pictures of a level are drawn by the same drawing, so they are the same
 * picture in every line and every colour — the copy the player compares against shows only what the
 * level's own differences name.
 */
export default function GameScene({ scene, changed, uid }) {
  const Drawn = SCENES[scene] || VillageScene;
  return <Drawn changed={changed} uid={uid} />;
}