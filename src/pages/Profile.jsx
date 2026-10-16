import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Ban, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { nowIso } from "@/lib/social";
import { openThread } from "@/lib/chat";
import usePageMeta from "@/lib/pageMeta";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileReels from "@/components/profile/ProfileReels";
import DeleteAccountSheet from "@/components/profile/DeleteAccountSheet";
import ModerationMenu from "@/components/moderation/ModerationMenu";
import BlockedSheet from "@/components/moderation/BlockedSheet";
import { blockedEmails } from "@/lib/moderation";

export default function Profile() {
  const { email } = useParams();
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [person, setPerson] = useState(null);
  const [reels, setReels] = useState([]);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [following, setFollowing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blocksOpen, setBlocksOpen] = useState(false);
  const [ready, setReady] = useState(false);

  // the page names the person it shows, and stays out of search results: a profile here is opened by
  // whoever the link was sent to, and by nobody else
  usePageMeta({
    title: person?.username
      ? `@${person.username} — Babembe Babondo GS`
      : "Profile — Babembe Babondo GS",
    description: person?.username
      ? `@${person.username} on Babembe Babondo GS: Kibembe reels and voice.`
      : "A profile on Babembe Babondo GS: Kibembe reels and voice.",
    noindex: true,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      const user = await base44.auth.me();
      if (!alive) return;
      setMe(user);
      const [page, posts, followers, followingCount, mine] = await Promise.all([
        base44.entities.Profile.filter({ user_email: email }, { limit: 1 }),
        base44.entities.Reel.filter(
          { author_email: email, publish_at: { $lte: nowIso() } },
          { sort: "-publish_at", limit: 12 }
        ),
        base44.entities.Follow.count({ following_email: email }),
        base44.entities.Follow.count({ follower_email: email }),
        user
          ? base44.entities.Follow.filter(
              { follower_email: user.email, following_email: email },
              { limit: 1 }
            )
          : { items: [] },
      ]);
      if (!alive) return;
      setPerson(
        page?.items?.[0] || { user_email: email, username: email.split("@")[0], avatar_url: "" }
      );
      setReels(posts?.items || []);
      setCounts({ followers: Number(followers) || 0, following: Number(followingCount) || 0 });
      setFollowing(mine?.items?.[0]?.id || null);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [email]);

  // whether this person is one the reader has kept out of their way
  useEffect(() => {
    if (!me?.email || !email || email === me.email) return undefined;
    let alive = true;
    blockedEmails(me.email).then((list) => {
      if (alive) setBlocked(list.includes(email));
    });
    return () => {
      alive = false;
    };
  }, [me, email]);

  const toggleFollow = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (following) {
        await base44.entities.Follow.delete(following);
        setFollowing(null);
        setCounts((prev) => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
      } else {
        const created = await base44.entities.Follow.create({
          follower_email: me.email,
          following_email: email,
        });
        setFollowing(created.id);
        setCounts((prev) => ({ ...prev, followers: prev.followers + 1 }));
      }
    } finally {
      setBusy(false);
    }
  };

  const openChat = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const thread = await openThread(me.email, email);
      navigate(`/messages/${thread.id}`);
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto overscroll-none bg-background pb-6">
      <header className="flex items-center gap-2 px-4 pb-1 pt-[max(0.6rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/70"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="font-display text-[16px] tracking-tight">Profile</h1>
        {/* the same menu stands on somebody else's page: report them, or keep them out of your way */}
        {me?.email && me.email !== email ? (
          <div className="ml-auto">
            <ModerationMenu
              me={me}
              ownerEmail={email}
              ownerUsername={person?.username}
              contentType="profile"
              contentId={email}
              excerpt={person?.username ? `@${person.username}` : ""}
              blocked={blocked}
              onChanged={setBlocked} />
          </div>
        ) : null}
      </header>

      <ProfileHeader
        person={person}
        email={email}
        counts={counts}
        following={!!following}
        isMe={me?.email === email}
        busy={busy}
        onFollow={toggleFollow}
        onMessage={openChat}
      />

      <ProfileReels reels={reels} onOpen={(reel) => navigate(`/reels?reel=${reel.id}`)} />

      {/* The person's own page carries the one row that ends their account, and the question asked
          before it does; somebody else's page carries none of it. */}
      {me?.email === email ? (
        <section className="px-4 pb-8 pt-6">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Account
          </p>
          <div className="account-actions border-border">
            <button
              type="button"
              className="account-action account-action-neutral"
              onClick={() => setBlocksOpen(true)}
            >
              <span className="account-action-label">
                <Ban className="h-4 w-4" aria-hidden="true" />
                Blocked accounts
              </span>
            </button>
          </div>
          <DeleteAccountSheet />
        </section>
      ) : null}

      <BlockedSheet
        open={blocksOpen}
        onClose={() => setBlocksOpen(false)}
        me={me}
        onChanged={(released, isBlocked) => {
          if (!isBlocked && released === email) setBlocked(false);
        }} />
    </div>
  );
}