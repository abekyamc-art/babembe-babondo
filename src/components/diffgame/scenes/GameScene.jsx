import React from "react";
import { Image } from "@/components/ui/image";
import { picturesOf } from "@/lib/differenceGame/scenePictures";
import VillageScene from "./VillageScene";
import MarketScene from "./MarketScene";
import ClassroomScene from "./ClassroomScene";
import PhotoChanges from "@/components/diffgame/scenes/PhotoChanges";

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
 * Photo scenes reuse the same background on both panels. Clear object edits are rendered from the
 * same bounds used by tap detection, so a required difference cannot be absent or displaced.
 * Found rings are added by the panel, never baked into the pictures.
 */
export default function GameScene({ scene, changed, uid, differences = [] }) {
  const pictures = picturesOf(scene);

  if (pictures) {
    return (
      <>
        <Image src={pictures.base} alt="" className="dg-art" draggable={false} />
        <PhotoChanges differences={differences} changed={changed || new Set()} />
      </>
    );
  }

  const Drawn = SCENES[scene] || VillageScene;
  return <Drawn changed={changed} uid={uid} />;
}