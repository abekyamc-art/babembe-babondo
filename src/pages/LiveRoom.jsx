import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { balanceOf, creditCoins, spendCoins } from "@/lib/coins";
import { filterCss } from "@/lib/videoFilters";
import { ensureProfile } from "@/lib/social";
import { clearRoom } from "@/lib/livePeers";
import useLiveRoom from "@/hooks/useLiveRoom";
import LiveStage from "@/components/live/LiveStage";
import LiveChat from "@/components/live/LiveChat";
import LiveGuests from "@/components/live/LiveGuests";
import JoinRequestBar from "@/components/live/JoinRequestBar";
import LiveControls from "@/components/live/LiveControls";
import GiftSheet from "@/components/live/GiftSheet";
import EffectsSheet from "@/components/live/EffectsSheet";
import FilterSheet from "@/components/live/FilterSheet";

export default function LiveRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [me, setMe] = useState(null);
  const [profile, setProfile] = useState(null);
  const [room, setRoom] = useState(null);
  const [myRequest, setMyRequest] = useState(null);
  const [requests, setRequests] = useState([]);
  const [busy, setBusy] = useState(false);
  const [gifting, setGifting] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [giftRequest, setGiftRequest] = useState(null);
  const [effectRequest, setEffectRequest] = useState(null);
  const [ready, setReady] = useState(false);
  const approvedRef = useRef(null);

  const sync = useCallback(
    async (user, isHost) => {
      const list = isHost
        ? await base44.entities.LiveRequest.filter(
            { room_id: id, status: "pending" },
            { sort: "created_date", limit: 20 }
          )
        : await base44.entities.LiveRequest.filter(
            { room_id: id, viewer_email: user.email },
            { sort: "-created_date", limit: 1 }
          );
      if (isHost) setRequests(list?.items || []);
      else setMyRequest(list?.items?.[0] || null);
    },
    [id]
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      const user = await base44.auth.me();
      if (!alive || !user) return;
      const [mine, loaded] = await Promise.all([
        ensureProfile(user),
        base44.entities.LiveRoom.get(id).catch(() => null),
      ]);
      if (!alive) return;
      setMe(user);
      setProfile(mine);
      setRoom(loaded);
      if (loaded) await sync(user, loaded.host_email === user.email);
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [id, sync]);

  useEffect(() => {
    if (!room || !me) return () => {};
    const isHost = room.host_email === me.email;
    const unsubscribeRequests = base44.entities.LiveRequest.subscribe(() => sync(me, isHost));
    const unsubscribeRoom = base44.entities.LiveRoom.subscribe((event) => {
      if (event.type === "update" && event.data?.id === room.id) setRoom(event.data);
    });
    return () => {
      unsubscribeRequests();
      unsubscribeRoom();
    };
  }, [room?.id, room?.host_email, me, sync]);

  useEffect(() => {
    approvedRef.current = myRequest?.status === "approved" ? myRequest.id : null;
  }, [myRequest]);

  // leaving the screen takes the viewer out of the audience
  useEffect(
    () => () => {
      if (approvedRef.current) {
        base44.entities.LiveRequest.update(approvedRef.current, { status: "left" }).catch(() => {});
      }
    },
    []
  );

  const isHost = !!room && !!me && room.host_email === me.email;
  const isGuest = myRequest?.status === "approved";
  const live = !!room && room.status === "live";
  const role = isHost ? "host" : isGuest ? "guest" : "viewer";

  const {
    peers,
    localStream,
    remoteStreams,
    mediaError,
    problem,
    guests,
    micOn,
    cameraOn,
    toggleMic,
    toggleCamera,
    flipCamera,
  } = useLiveRoom({
    roomId: id,
    me,
    username: profile?.username,
    avatarUrl: profile?.avatar_url,
    role,
    live,
  });

  const viewerCount = peers.filter((peer) => peer.user_email !== (room?.host_email || "")).length;
  const hostRow = peers.find((peer) => peer.user_email === room?.host_email);
  const pictureOn = isHost ? cameraOn : hostRow?.camera_on !== false;
  const filter = room?.filter || "none";

  const requestToJoin = async () => {
    setBusy(true);
    try {
      const created = await base44.entities.LiveRequest.create({
        room_id: room.id,
        viewer_email: me.email,
        viewer_username: profile?.username || "viewer",
        status: "pending",
        requested_at: new Date().toISOString(),
      });
      setMyRequest(created);
    } finally {
      setBusy(false);
    }
  };

  const cancelRequest = async () => {
    if (!myRequest) return;
    setBusy(true);
    try {
      await base44.entities.LiveRequest.delete(myRequest.id);
      setMyRequest(null);
    } finally {
      setBusy(false);
    }
  };

  const decide = async (request, status) => {
    await base44.entities.LiveRequest.update(request.id, { status });
    await sync(me, true);
  };

  // letting a guest go hands them back to watching
  const removeGuest = async (guest) => {
    setBusy(true);
    try {
      const page = await base44.entities.LiveRequest.filter(
        { room_id: id, viewer_email: guest.user_email, status: "approved" },
        { limit: 1 }
      );
      const row = page?.items?.[0];
      if (row) await base44.entities.LiveRequest.update(row.id, { status: "left" });
    } finally {
      setBusy(false);
    }
  };

  const leaveRoom = async () => {
    if (myRequest?.status === "approved") {
      await base44.entities.LiveRequest.update(myRequest.id, { status: "left" });
    }
    navigate("/reels");
  };

  const endLive = async () => {
    await base44.entities.LiveRoom.update(room.id, {
      status: "ended",
      ended_at: new Date().toISOString(),
    });
    await clearRoom(id);
    navigate("/reels");
  };

  const sendGift = async (gift) => {
    if (balanceOf(profile) < gift.coins) {
      toast({
        title: "Not enough coins",
        description: `${gift.name} costs ${gift.coins} coins.`,
      });
      return false;
    }
    setGifting(true);
    try {
      const spent = await spendCoins(profile, gift.coins);
      if (!spent) return false;
      setProfile(spent);
      await creditCoins(room.host_email, gift.coins);
      return true;
    } finally {
      setGifting(false);
    }
  };

  const pickGift = (gift) => {
    setSheet(null);
    setGiftRequest({ gift, at: Date.now() });
  };

  const pickEffect = (effect) => {
    setSheet(null);
    setEffectRequest({ effect, at: Date.now() });
  };

  const chooseFilter = async (id) => {
    setSheet(null);
    if (!isHost) return;
    const updated = await base44.entities.LiveRoom.update(room.id, { filter: id });
    setRoom(updated);
  };

  if (!ready) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-4 bg-background px-8 text-center">
        <p className="text-[15px] text-muted-foreground">This live is no longer here.</p>
        <button
          type="button"
          onClick={() => navigate("/reels")}
          className="rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background"
        >
          Back to reels
        </button>
      </div>
    );
  }

  if (!live) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-4 bg-foreground px-8 text-center text-background">
        <p className="text-[15px] text-white/70">This live has ended.</p>
        <button
          type="button"
          onClick={() => navigate("/reels")}
          className="rounded-full bg-white/15 px-5 py-2.5 text-[13px] font-medium"
        >
          Back to reels
        </button>
      </div>
    );
  }

  return (
    <>
      <LiveStage
        isHost={isHost}
        hostEmail={room.host_email}
        hostUsername={room.host_username}
        hostAvatarUrl={room.host_avatar_url}
        localStream={localStream}
        remoteStreams={remoteStreams}
        mediaError={mediaError}
        problem={problem}
        viewerCount={viewerCount}
        coins={balanceOf(profile)}
        requests={requests}
        busy={busy}
        filter={filterCss(filter)}
        pictureOn={pictureOn}
        onApprove={(request) => decide(request, "approved")}
        onDecline={(request) => decide(request, "declined")}
        onExit={isHost ? endLive : leaveRoom}
        overlays={
          <>
            <FilterSheet
              open={sheet === "filters"}
              value={filter}
              onPick={chooseFilter}
              onClose={() => setSheet(null)}
            />
            <GiftSheet
              open={sheet === "gifts"}
              coins={balanceOf(profile)}
              sending={gifting}
              onPick={pickGift}
              onClose={() => setSheet(null)}
            />
            <EffectsSheet
              open={sheet === "effects"}
              onPick={pickEffect}
              onClose={() => setSheet(null)}
            />
          </>
        }
      >
        <LiveControls
          isHost={isHost}
          isGuest={isGuest}
          canGift={!isHost}
          micOn={micOn}
          cameraOn={cameraOn}
          onToggleMic={toggleMic}
          onToggleCamera={toggleCamera}
          onFlip={flipCamera}
          onFilters={() => setSheet("filters")}
          onEffects={() => setSheet("effects")}
          onGifts={() => setSheet("gifts")}
        />
        <LiveGuests guests={guests} isHost={isHost} onRemove={removeGuest} />
        {!isHost ? (
          <JoinRequestBar
            approved={isGuest}
            pending={myRequest?.status === "pending"}
            busy={busy}
            onRequest={requestToJoin}
            onCancel={cancelRequest}
          />
        ) : null}
        <LiveChat
          room={room}
          me={me}
          username={profile?.username}
          canChat={live}
          onGift={sendGift}
          giftRequest={giftRequest}
          effectRequest={effectRequest}
          onOpenProfile={(email) => navigate(`/u/${email}`)}
        />
      </LiveStage>

      {/* live is portrait only — landscape turns the phone into a "rotate back" screen */}
      <div className="live-rotate-hint fixed inset-0 z-50 flex-col items-center justify-center gap-3 bg-foreground text-center">
        <p className="text-[15px] font-semibold">Turn your phone upright</p>
        <p className="text-[13px] text-white/60">Live works in portrait.</p>
      </div>
    </>
  );
}