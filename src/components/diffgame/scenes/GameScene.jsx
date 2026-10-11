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
 * Photo levels show the original and its edited 4K photograph, with no illustrated overlays.
 * Found rings are added only after a player spots a difference.
 */
export default function GameScene({ scene, changed, uid, differences = [] }) {
  const pictures = picturesOf(scene);

  if (pictures) {
    return (
      <Image src={changed?.size ? pictures.changed : pictures.base}
        alt="" className="dg-art" draggable={false} quality={95} fittingType="fit" />
    );
  }

  const Drawn = SCENES[scene] || VillageScene;
  return <Drawn changed={changed} uid={uid} />;
}