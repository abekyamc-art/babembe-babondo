import React from "react";
import { Image } from "@/components/ui/image";
import { picturesOf } from "@/lib/differenceGame/scenePictures";
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
 * One picture of a level.
 *
 * A scene drawn in the app's own lines stands twice from the same drawing, so the two copies are the same
 * picture in every line and every colour, and only what `changed` names is taken away or turned.
 *
 * A scene drawn as a 4K picture stands from its two drawn photographs instead: the copy the player compares
 * against is the picture as it was drawn, and the copy below is that same picture with only the level's own
 * differences made in it. Nothing is ever marked on either of them — the places are found, not shown.
 */
export default function GameScene({ scene, changed, uid }) {
  const pictures = picturesOf(scene);

  if (pictures) {
    const differing = !!(changed && changed.size);
    return (
      <Image
        src={differing ? pictures.changed : pictures.base}
        alt=""
        className="dg-art"
      />
    );
  }

  const Drawn = SCENES[scene] || VillageScene;
  return <Drawn changed={changed} uid={uid} />;
}