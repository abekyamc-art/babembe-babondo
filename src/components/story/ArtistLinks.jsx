import React, { useState } from "react";
import { ExternalLink, Play } from "lucide-react";
import { hostOf } from "@/lib/stories";
import { videoKey } from "@/lib/channelSync";
import { youtubeVideo } from "@/lib/youtube";
import YouTubePlayer from "@/components/story/YouTubePlayer";

/**
 * The artist's own places: their channel, standing on its own, and every video or piece they have
 * published, each one its own entry with the name it goes by.
 *
 * This is not part of the telling and it is not one of the story's references: it is drawn after the
 * story, in two places of its own, so a person meets the channel and then the videos one under the
 * other. An entry opens where it already stands, and what takes the person away from the talk hands
 * the talk back.
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

          {rows
            .filter((entry) => !(named && told && entry === named))
            .map((entry, index) => {
              // a video the artist has published is played right here, with its own sound, as a
              // video link inside the telling is; anything else still opens where it stands
              const video = youtubeVideo(entry.url);
              const shown = !!video && openAt === index;

              if (video) {
                return (
                  <div key={`${entry.url}-${index}`} className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setOpenAt(shown ? -1 : index)}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-left transition hover:border-accent/50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-body text-[13px] text-foreground">
                          {entry.name || hostOf(entry.url)}
                        </span>
                        <span className="block truncate font-body text-[11px] text-muted-foreground">
                          {shown ? "Playing here · tap to put it away" : "Plays here · YouTube"}
                        </span>
                      </span>
                      <Play className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </button>

                    {shown ? (
                      <YouTubePlayer
                        url={entry.url}
                        title={entry.name || ""}
                        onPlaybackEnd={onPlaybackEnd}
                      />
                    ) : null}
                  </div>
                );
              }

              return (
                <button
                  key={`${entry.url}-${index}`}
                  type="button"
                  onClick={() => open(entry.url)}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-left transition hover:border-accent/50"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-body text-[13px] text-foreground">
                      {entry.name || hostOf(entry.url)}
                    </span>
                    <span className="block truncate font-body text-[11px] text-muted-foreground">
                      {hostOf(entry.url)}
                    </span>
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              );
            })}
        </div>
      ) : null}
    </div>
  );
}