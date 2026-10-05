import React from "react";
import { MessageCircle } from "lucide-react";
import { Image } from "@/components/ui/image";

/** Whoever a profile belongs to, with the two ways to reach them. */
export default function ProfileHeader({
  person,
  email,
  counts,
  following,
  isMe,
  busy,
  onFollow,
  onMessage,
}) {
  const username = person?.username || email.split("@")[0];

  return (
    <header className="flex flex-col items-center gap-4 px-6 pb-5 pt-3 text-center">
      <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full border border-border bg-secondary text-[28px] font-semibold uppercase text-muted-foreground">
        {person?.avatar_url ? (
          <Image
            src={person.avatar_url}
            alt=""
            focalPointX={person.avatar_crop_x}
            focalPointY={person.avatar_crop_y}
            className="h-24 w-24"
          />
        ) : (
          username.slice(0, 1)
        )}
      </div>

      <div>
        <h1 className="font-display text-[24px] tracking-tight">@{username}</h1>
        {isMe ? <p className="text-[12px] text-muted-foreground">This is you</p> : null}
      </div>

      <div className="flex items-center gap-7 text-[13px] text-muted-foreground">
        <span>
          <b className="text-[15px] font-semibold text-foreground">{counts.followers}</b> followers
        </span>
        <span>
          <b className="text-[15px] font-semibold text-foreground">{counts.following}</b> following
        </span>
      </div>

      {isMe ? null : (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onFollow}
            disabled={busy}
            className={`rounded-full px-6 py-2.5 text-[13px] font-semibold ${
              following ? "border border-border text-foreground" : "bg-foreground text-background"
            }`}
          >
            {following ? "Following" : "Follow"}
          </button>
          <button
            type="button"
            onClick={onMessage}
            disabled={busy}
            aria-label={`Message @${username}`}
            className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-foreground shadow-sm"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
        </div>
      )}
    </header>
  );
}