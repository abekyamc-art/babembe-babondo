import React, { forwardRef } from "react";
import FilePlayer from "@/components/story/FilePlayer";
import YouTubePlayer from "@/components/story/YouTubePlayer";
import { videoFile } from "@/lib/videoFile";

/**
 * The app's own player, whichever kind of piece stands in it.
 *
 * The app holds two kinds of piece: one that stands on YouTube, and a recording the app itself keeps,
 * standing at its own address — the song an artist gave the app, which YouTube would never play
 * because it is not YouTube's. A piece on YouTube is played in place by the YouTube player, exactly as
 * it always was; a recording is played by the player the app keeps for its own files.
 *
 * The player standing here is handed straight to whichever player takes the piece, so the app's own
 * pause, start and stop always reach the player really holding the sound.
 */
const ClipPlayer = forwardRef(function ClipPlayer({ url, ...rest }, ref) {
  const file = videoFile(url);
  if (file) return <FilePlayer ref={ref} src={file.src} {...rest} />;
  return <YouTubePlayer ref={ref} url={url} {...rest} />;
});

export default ClipPlayer;