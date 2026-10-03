import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, MessageCircle, Plus, Radio, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { BOOST_COST, BOOST_HOURS, balanceOf, spendCoins } from "@/lib/coins";
import { countMap, ensureProfile, escapeRegex, nowIso, reelLink } from "@/lib/social";
import LiveBar from "@/components/live/LiveBar";
import GoLiveDialog from "@/components/live/GoLiveDialog";
import ReelFeed from "@/components/reels/ReelFeed";
import ReelUpload from "@/components/reels/ReelUpload";
import CommentsSheet from "@/components/reels/CommentsSheet";
import PeoplePanel from "@/components/reels/PeoplePanel";

export default function Reels() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [me, setMe] = useState(null);
  const [profile, setProfile] = useState(null);
  const [reels, setReels] = useState([]);
  const [likeCounts, setLikeCounts] = useState({});
  const [commentCounts, setCommentCounts] = useState({});
  const [myLikes, setMyLikes] = useState({});
  const [people, setPeople] = useState([]);
  const [iFollow, setIFollow] = useState({});
  const [followsMe, setFollowsMe] = useState([]);
  const [muted, setMuted] = useState(true);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [commentReel, setCommentReel] = useState(null);
  const [ready, setReady] = useState(false);

  // the feed's own loader: the first load and a pull-to-refresh run the same queries
  const loadFeed = useCallback(async () => {
    const user = await base44.auth.me();
    if (!user) return;
    const mine = await ensureProfile(user);
      const [page, boosted] = await Promise.all([
        base44.entities.Reel.filter(
          { publish_at: { $lte: nowIso() } },
          { sort: "-publish_at", limit: 30 }
        ),
        base44.entities.Reel.filter(
          { boost_until: { $gte: nowIso() } },
          { sort: "-boost_until", limit: 3 }
        ),
      ]);
      // paid boosts hold their reel at the top of the feed
      const promoted = boosted?.items || [];
      const items = [
        ...promoted,
        ...(page?.items || []).filter((reel) => !promoted.some((item) => item.id === reel.id)),
      ];

      // a shared link opens straight on that reel
      const sharedId = new URLSearchParams(window.location.search).get("reel");
      if (sharedId && !items.some((reel) => reel.id === sharedId)) {
        const shared = await base44.entities.Reel.get(sharedId).catch(() => null);
        if (shared) items.unshift(shared);
      }

      setMe(user);
      setProfile(mine);
      setReels(items);

      const ids = items.map((reel) => reel.id);
      const [likes, comments, mineLikes, following, followers, everyone, liveRooms] = await Promise.all([
        ids.length
          ? base44.entities.ReelLike.aggregate({
              query: { reel_id: { $in: ids } },
              groupBy: "reel_id",
            })
          : { rows: [] },
        ids.length
          ? base44.entities.ReelComment.aggregate({
              query: { reel_id: { $in: ids } },
              groupBy: "reel_id",
            })
          : { rows: [] },
        ids.length
          ? base44.entities.ReelLike.filter(
              { user_email: user.email, reel_id: { $in: ids } },
              { limit: 100 }
            )
          : { items: [] },
        base44.entities.Follow.filter({ follower_email: user.email }, { limit: 200 }),
        base44.entities.Follow.filter({ following_email: user.email }, { limit: 200 }),
        base44.entities.Profile.list({ sort: "-created_date", limit: 50 }),
        base44.entities.LiveRoom.filter({ status: "live" }, { sort: "-started_at", limit: 10 }),
      ]);
      setLikeCounts(countMap(likes?.rows));
      setCommentCounts(countMap(comments?.rows));
      setMyLikes(Object.fromEntries((mineLikes?.items || []).map((like) => [like.reel_id, like.id])));
      setIFollow(
        Object.fromEntries((following?.items || []).map((row) => [row.following_email, row.id]))
      );
      setFollowsMe((followers?.items || []).map((row) => row.follower_email));
      setPeople(everyone?.items || []);
      setRooms(liveRooms?.items || []);
      setReady(true);
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  // the live bar stays current while the feed is open
  useEffect(() => {
    if (!ready) return undefined;
    const load = async () => {
      const page = await base44.entities.LiveRoom.filter(
        { status: "live" },
        { sort: "-started_at", limit: 10 }
      );
      setRooms(page?.items || []);
    };
    return base44.entities.LiveRoom.subscribe(load);
  }, [ready]);

  const searchPeople = useCallback(async (term) => {
    const trimmed = term.trim();
    if (!trimmed) {
      const page = await base44.entities.Profile.list({ sort: "-created_date", limit: 50 });
      setPeople(page?.items || []);
      return;
    }
    const page = await base44.entities.Profile.filter(
      { username: { $regex: escapeRegex(trimmed), $options: "i" } },
      { limit: 30 }
    );
    setPeople(page?.items || []);
  }, []);

  // following shows the moment it is tapped, and quietly comes undone if it could not be saved
  const followEmail = async (email) => {
    const existing = iFollow[email];
    if (existing) {
      setIFollow((prev) => {
        const next = { ...prev };
        delete next[email];
        return next;
      });
      try {
        await base44.entities.Follow.delete(existing);
      } catch (err) {
        setIFollow((prev) => ({ ...prev, [email]: existing }));
      }
      return;
    }

    const pending = `local-${Date.now()}`;
    setIFollow((prev) => ({ ...prev, [email]: pending }));
    try {
      const created = await base44.entities.Follow.create({
        follower_email: me.email,
        following_email: email,
      });
      setIFollow((prev) => (prev[email] === pending ? { ...prev, [email]: created.id } : prev));
    } catch (err) {
      setIFollow((prev) => {
        const next = { ...prev };
        if (next[email] === pending) delete next[email];
        return next;
      });
    }
  };

  // the heart answers at once; the count goes back if the like never reached the server
  const handleLike = async (reel) => {
    const likeId = myLikes[reel.id];
    if (likeId) {
      setMyLikes((prev) => {
        const next = { ...prev };
        delete next[reel.id];
        return next;
      });
      setLikeCounts((prev) => ({ ...prev, [reel.id]: Math.max(0, (prev[reel.id] || 0) - 1) }));
      try {
        await base44.entities.ReelLike.delete(likeId);
      } catch (err) {
        setMyLikes((prev) => ({ ...prev, [reel.id]: likeId }));
        setLikeCounts((prev) => ({ ...prev, [reel.id]: (prev[reel.id] || 0) + 1 }));
      }
      return;
    }

    const pending = `local-${Date.now()}`;
    setMyLikes((prev) => ({ ...prev, [reel.id]: pending }));
    setLikeCounts((prev) => ({ ...prev, [reel.id]: (prev[reel.id] || 0) + 1 }));
    try {
      const created = await base44.entities.ReelLike.create({
        reel_id: reel.id,
        user_email: me.email,
      });
      setMyLikes((prev) => (prev[reel.id] === pending ? { ...prev, [reel.id]: created.id } : prev));
    } catch (err) {
      setMyLikes((prev) => {
        const next = { ...prev };
        if (next[reel.id] === pending) delete next[reel.id];
        return next;
      });
      setLikeCounts((prev) => ({ ...prev, [reel.id]: Math.max(0, (prev[reel.id] || 0) - 1) }));
    }
  };

  const handleBoost = async (reel) => {
    if (balanceOf(profile) < BOOST_COST) {
      toast({
        title: "Not enough coins",
        description: `A boost costs ${BOOST_COST} coins — your balance lives in the coin store.`,
      });
      return;
    }
    const spent = await spendCoins(profile, BOOST_COST);
    if (!spent) return;
    setProfile(spent);
    const until = new Date(Date.now() + BOOST_HOURS * 60 * 60 * 1000).toISOString();
    const updated = await base44.entities.Reel.update(reel.id, { boost_until: until });
    setReels((prev) => [updated, ...prev.filter((item) => item.id !== reel.id)]);
    toast({ title: "Reel boosted", description: "It sits at the top of the feed for 24 hours." });
  };

  const handleShare = async (reel) => {
    const url = reelLink(reel.id);
    try {
      if (navigator.share) {
        await navigator.share({ title: `@${reel.author_username || "reel"}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied", description: "Send it to a friend." });
    } catch (err) {
      // the share sheet was dismissed
    }
  };

  const handlePosted = (reel, scheduled) => {
    if (scheduled) {
      toast({ title: "Reel scheduled", description: "It appears in the feed at that time." });
      return;
    }
    setReels((prev) => [reel, ...prev]);
    toast({ title: "Reel posted" });
  };

  if (!ready) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-background">
      <header className="relative z-20 flex items-center gap-2 px-4 pb-2 pt-[max(0.6rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => navigate("/")}
          aria-label="Back"
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/70"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="flex-1 font-display text-[16px] tracking-tight">Reels</h1>
        <button
          type="button"
          onClick={() => navigate("/messages")}
          aria-label="Messages"
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/70"
        >
          <MessageCircle className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setLiveOpen(true)}
          aria-label="Go live"
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/70"
        >
          <Radio className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setPeopleOpen(true)}
          aria-label="Find people"
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/70"
        >
          <Search className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          aria-label="New reel"
          className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-background"
        >
          <Plus className="h-4 w-4" />
        </button>
      </header>

      <LiveBar rooms={rooms} onOpen={(room) => navigate(`/live/${room.id}`)} />

      <ReelFeed
        reels={reels}
        onRefresh={loadFeed}
        likeCounts={likeCounts}
        commentCounts={commentCounts}
        myLikes={myLikes}
        iFollow={iFollow}
        followsMe={followsMe}
        me={me}
        people={people}
        muted={muted}
        onLike={handleLike}
        onComments={setCommentReel}
        onShare={handleShare}
        onFollow={followEmail}
        onBoost={handleBoost}
        onToggleMute={() => setMuted((prev) => !prev)}
        onUpload={() => setUploadOpen(true)}
        onAuthor={(email) => navigate(`/u/${email}`)}
      />

      <PeoplePanel
        open={peopleOpen}
        onOpenChange={setPeopleOpen}
        people={people}
        iFollow={iFollow}
        followsMe={followsMe}
        me={me}
        onFollow={(person) => followEmail(person.user_email)}
        onSearch={searchPeople}
        onOpenPerson={(person) => {
          setPeopleOpen(false);
          navigate(`/u/${person.user_email}`);
        }}
      />

      <ReelUpload
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        user={me}
        profile={profile}
        onPosted={handlePosted}
      />

      <GoLiveDialog
        open={liveOpen}
        onOpenChange={setLiveOpen}
        user={me}
        profile={profile}
        onStarted={(room) => navigate(`/live/${room.id}`)}
      />

      <CommentsSheet
        open={!!commentReel}
        onOpenChange={(next) => {
          if (!next) setCommentReel(null);
        }}
        reel={commentReel}
        me={me}
        username={profile?.username}
        onAdded={(reelId) =>
          setCommentCounts((prev) => ({ ...prev, [reelId]: (prev[reelId] || 0) + 1 }))
        }
      />
    </div>
  );
}