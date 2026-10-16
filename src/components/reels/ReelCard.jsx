import React, { useEffect, useRef, useState } from "react";
import { Heart, Link2, MessageCircle, Send, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Image } from "@/components/ui/image";
import ModerationMenu from "@/components/moderation/ModerationMenu";

export default function ReelCard({
  reel,
  authorAvatar,
  liked,
  likeCount,
  commentCount,
  following,
  followsMe,
  isMine,
  boosted,
  muted,
  me,
  blocked,
  onDelete,
  onChanged,
  onLike,
  onComments,
  onShare,
  onCopy,
  onFollow,
  onBoost,
  onToggleMute,
  onAuthor,
}) {
  const videoRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = videoRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.6 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = videoRef.current;
    if (!node) return;
    if (visible) {
      node.play().catch(() => {});
    } else {
      node.pause();
      node.currentTime = 0;
    }
  }, [visible]);

  const togglePlay = () => {
    const node = videoRef.current;
    if (!node) return;
    if (node.paused) node.play().catch(() => {});
    else node.pause();
  };

  const followLabel = following ? "Following" : followsMe ? "Follow back" : "Follow";

  return (
    <section className="relative h-full w-full bg-black">
      <video
        ref={videoRef}
        src={reel.video_url}
        loop
        muted={muted}
        playsInline
        onClick={togglePlay}
        className="h-full w-full object-cover"
      />

      <button
        type="button"
        onClick={onToggleMute}
        aria-label={muted ? "Turn sound on" : "Turn sound off"}
        className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white"
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>

      {/* the same menu stands on every reel: report it, keep its owner out of the way, or take your
           own down */}
      <div className="absolute right-3 top-14">
        <ModerationMenu
          me={me}
          ownerEmail={reel.author_email}
          ownerUsername={reel.author_username}
          contentType="reel"
          contentId={reel.id}
          excerpt={reel.caption || ""}
          isMine={isMine}
          blocked={!!blocked}
          onDelete={onDelete}
          onChanged={onChanged} />
      </div>

      <div className="absolute bottom-24 right-3 flex flex-col items-center gap-5 text-white">
        <button type="button" onClick={onLike} aria-label="Like" className="flex flex-col items-center gap-1">
          <Heart className={cn("h-7 w-7", liked && "fill-destructive text-destructive")} />
          <span className="text-[11px] font-semibold">{likeCount}</span>
        </button>
        <button
          type="button"
          onClick={onComments}
          aria-label="Comments"
          className="flex flex-col items-center gap-1"
        >
          <MessageCircle className="h-7 w-7" />
          <span className="text-[11px] font-semibold">{commentCount}</span>
        </button>
        <button type="button" onClick={onShare} aria-label="Share" className="flex flex-col items-center gap-1">
          <Send className="h-7 w-7" />
          <span className="text-[11px] font-semibold">Share</span>
        </button>
        <button type="button" onClick={onCopy} aria-label="Copy link" className="flex flex-col items-center gap-1">
          <Link2 className="h-7 w-7" />
          <span className="text-[11px] font-semibold">Copy</span>
        </button>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-6 pt-16 text-white">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAuthor}
            aria-label={`Open @${reel.author_username || "friend"}'s profile`}
            className="pointer-events-auto flex min-w-0 items-center gap-2"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-white/15 text-[12px] font-semibold uppercase">
              {authorAvatar ? (
                <Image src={authorAvatar} alt="" className="h-8 w-8" />
              ) : (
                (reel.author_username || "?").slice(0, 1)
              )}
            </span>
            <span className="truncate text-[14px] font-semibold">@{reel.author_username || "friend"}</span>
          </button>
          {boosted ? (
            <span className="shrink-0 rounded-full bg-accent/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
              Boosted
            </span>
          ) : null}
          {!isMine ? (
            <button
              type="button"
              onClick={onFollow}
              className={cn(
                "pointer-events-auto shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold",
                following ? "border border-white/50 text-white" : "bg-accent text-accent-foreground"
              )}
            >
              {followLabel}
            </button>
          ) : null}
        </div>
        {reel.caption ? (
          <p className="mt-2 line-clamp-3 text-[13px] leading-snug text-white/90">{reel.caption}</p>
        ) : null}
        {isMine && !boosted ? (
          <button
            type="button"
            onClick={onBoost}
            className="pointer-events-auto mt-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white"
          >
            Boost this reel
          </button>
        ) : null}
      </div>
    </section>
  );
}