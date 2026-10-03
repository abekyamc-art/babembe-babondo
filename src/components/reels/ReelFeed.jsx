import React from "react";
import ReelCard from "@/components/reels/ReelCard";

export default function ReelFeed({
  reels,
  likeCounts,
  commentCounts,
  myLikes,
  iFollow,
  followsMe,
  me,
  people,
  muted,
  onLike,
  onComments,
  onShare,
  onFollow,
  onBoost,
  onToggleMute,
  onUpload,
  onAuthor,
}) {
  const avatars = {};
  (people || []).forEach((person) => {
    avatars[person.user_email] = person.avatar_url || "";
  });

  if (!reels.length) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="text-[15px] text-muted-foreground">No reels yet. Post the first one.</p>
        <button
          type="button"
          onClick={onUpload}
          className="rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background"
        >
          Create a reel
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-y-contain">
      {reels.map((reel) => (
        <div key={reel.id} className="h-full w-full snap-start snap-always">
          <ReelCard
            reel={reel}
            authorAvatar={avatars[reel.author_email] || ""}
            liked={!!myLikes[reel.id]}
            likeCount={likeCounts[reel.id] || 0}
            commentCount={commentCounts[reel.id] || 0}
            following={!!iFollow[reel.author_email]}
            followsMe={(followsMe || []).includes(reel.author_email)}
            isMine={reel.author_email === me?.email}
            boosted={!!reel.boost_until && Date.parse(reel.boost_until) > Date.now()}
            muted={muted}
            onLike={() => onLike(reel)}
            onComments={() => onComments(reel)}
            onShare={() => onShare(reel)}
            onFollow={() => onFollow(reel.author_email)}
            onBoost={() => onBoost(reel)}
            onToggleMute={onToggleMute}
            onAuthor={() => onAuthor(reel.author_email)}
          />
        </div>
      ))}
    </div>
  );
}