import React from "react";
import { Image } from "@/components/ui/image";
import { picturesOf } from "@/lib/differenceGame/scenePictures";
import ToonScene from "@/lib/differenceGame/toon/ToonScene";
import { toonSpecOf } from "@/lib/differenceGame/toon/toonLevels";
import VillageScene from "./VillageScene";
import MarketScene from "./MarketScene";
import ClassroomScene from "./ClassroomScene";
import DrumCircleScene from "./DrumCircleScene";
import RiverWashScene from "./RiverWashScene";
import GoatHillScene from "./GoatHillScene";


/** Which drawing belongs to which scene name. */
const SCENES = {
  village: VillageScene,
  market: MarketScene,
  classroom: ClassroomScene,
  drumcircle: DrumCircleScene,
  riverwash: RiverWashScene,
  goathill: GoatHillScene,
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
export default function GameScene({ scene, changed, uid, differences = [], onLoad, art }) {
  // An episode whose own cartoon picture already stands is played on that picture: the scene as it was
  // drawn for this episode, and the copy drawn from it with only this episode's own changes made.
  if (art?.base_url) {
    return (
      <Image src={changed?.size ? art.changed_url : art.base_url}
        alt="" className="dg-art" draggable={false} quality={95} fittingType="fit"
        style={{ objectFit: 'contain' }} onLoad={onLoad} />
    );
  }

  // a cartoon episode is drawn from its own recipe, so its two copies are the same picture in every line
  const toon = toonSpecOf(scene);
  if (toon) return <ToonScene spec={toon} changed={changed} uid={uid} />;

  const pictures = picturesOf(scene);

  if (pictures) {
    return (
      <Image src={changed?.size ? pictures.changed : pictures.base}
        alt="" className="dg-art" draggable={false} quality={95} fittingType="fit"
        style={{ objectFit: 'contain' }} onLoad={onLoad} />
    );
  }

  const Drawn = SCENES[scene] || VillageScene;
  return <Drawn changed={changed} uid={uid} />;
}