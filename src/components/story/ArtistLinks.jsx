import React, { useState } from "react";
import { ExternalLink, ListVideo } from "lucide-react";
import { hostOf } from "@/lib/stories";
import { videoKey } from "@/lib/channelSync";
import { youtubeVideo } from "@/lib/youtube";
import YouTubePlayer from "@/components/story/YouTubePlayer";
import ArtistVideoRow from "@/components/story/ArtistVideoRow";
import ArtistVideosSheet from "@/components/story/ArtistVideosSheet";

// How many of the artist's published pieces stand in the story itself. A channel with a lot
// published keeps the telling short: everything past these waits behind the one control below.
const SHOWN = 5;

/**
 * The artist's own places: their channel, standing on its own, and every video or piece they have
 * published, each one its own entry with the name it goes by.
 *
 * This is not part of the telling and it is not one of the story's references: it is drawn after the
 * story, in two places of its own, so a person meets the channel and then the videos one under the
 * other. An entry opens where it already stands, and what takes the person away from the talk hands
 * the talk back.
 *
 * Only the first few pieces stand in the story. A channel with plenty published keeps the telling
 * short: everything past them waits behind the one control below, which opens the whole list in a
 * place of its own.
 */
export default function ArtistLinks({
  channel = "",
  links = [],
  matched = null,
  onOpen,
  onPlaybackEnd,
}) {
  // which published piece is standing open right now, so only one is played at a time
  const [openAt, setOpenAt] = useState(-1);
  // the whole list, once it has been asked for
  const [allOpen, setAllOpen] = useState(false);
  const all = (Array.isArray(links) ? links : []).filter((entry) => entry?.url);
  // the piece the person asked about stands first, so it is the one they meet
  const named = matched?.url
    ? all.find((entry) => videoKey(entry.url) === videoKey(matched.url))
    : null;
  const rows = named ? [named, ...all.filter((entry) => entry !== named)] : all;
  if (!channel && !rows.length) return null;

  // when the piece that was asked for is a video it is played right here, with its own sound; the
  // story is handed back the moment the playing is over. Anything else opens where it stands.
  const told = named ? youtubeVideo(named.url) : null;
  // the piece being played stands above the list, so only the plain pieces are counted against it
  const listed = rows.filter((entry) => !(named && told && entry === named));
  const top = listed.slice(0, SHOWN);
  const rest = listed.slice(SHOWN);

  const open = (url) => {
    if (onOpen) {
      onOpen(url);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const head =
    "font-body text-[10px] uppercase tracking-[0.16em] text-muted-foreground";

  return (
    <div className="flex flex-col gap-4 border-t border-border pt-3">
      {channel ? (
        <div className="flex flex-col gap-2">
          <span className={head}>The channel</span>
          <button
            type="button"
            onClick={() => open(channel)}
            className="flex items-center justify-between gap-3 rounded-xl border border-accent/50 bg-accent/10 px-3 py-2 text-left font-body text-[13px] font-semibold text-accent transition active:scale-[0.99]"
          >
            <span className="truncate">Open the channel · {hostOf(channel)}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </button>
        </div>
      ) : null}

      {rows.length ? (
        <div className="flex flex-col gap-2">
          <span className={head}>Published by the artist</span>

          {named && told ? (
            <div className="flex flex-col gap-2">
              <span className="font-body text-[12px] text-muted-foreground">
                {named.name || "The piece you asked about"} — playing here.
              </span>
              <YouTubePlayer
                url={named.url}
                title={named.name || ""}
                onPlaybackEnd={onPlaybackEnd}
              />
            </div>
          ) : null}

          {top.map((entry, index) => (
            <ArtistVideoRow
              key={`${entry.url}-${index}`}
              entry={entry}
              shown={openAt === index}
              onToggle={() => setOpenAt(openAt === index ? -1 : index)}
              onOpen={open}
              onPlaybackEnd={onPlaybackEnd}
            />
          ))}

          {/* a channel with plenty published keeps the story short: everything past the first few
              waits behind this one control, which opens the whole list in a place of its own */}
          {rest.length ? (
            <button
              type="button"
              onClick={() => {
                setOpenAt(-1);
                setAllOpen(true);
              }}
              className="flex items-center justify-between gap-3 rounded-xl border border-accent/50 bg-accent/10 px-3 py-2 text-left font-body text-[13px] font-semibold text-accent transition active:scale-[0.99]"
            >
              <span className="truncate">All the artist's videos · {listed.length}</span>
              <ListVideo className="h-3.5 w-3.5 shrink-0" />
            </button>
          ) : null}
        </div>
      ) : null}

      {allOpen ? (
        <ArtistVideosSheet
          title={`Every video · ${rows.length}`}
          rows={rows}
          onClose={() => setAllOpen(false)}
          onOpen={open}
          onPlaybackEnd={onPlaybackEnd}
        />
      ) : null}
    </div>
  );
}