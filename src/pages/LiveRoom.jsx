import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Coins, Loader2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { balanceOf, creditCoins, spendCoins } from "@/lib/coins";
import { ensureProfile } from "@/lib/social";
import LiveStage from "@/components/live/LiveStage";
import LiveChat from "@/components/live/LiveChat";

export default function LiveRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [me, setMe] = useState(null);
  const [profile, setProfile] = useState(null);
  const [room, setRoom] = useState(null);
  const [myRequest, setMyRequest] = useState(null);
  const [requests, setRequests] = useState([]);
  const [viewers, setViewers] = useState(0);
  const [busy, setBusy] = useState(false);
  const [gifting, setGifting] = useState(false);
  const [ready, setReady] = useState(false);
  const approvedRef = useRef(null);

  const sync = useCallback(
    async (user, isHost) => {
      const [count, list] = await Promise.all([
        base44.entities.LiveRequest.count({ room_id: id, status: "approved" }),
        isHost
          ? base44.entities.LiveRequest.filter(
              { room_id: id, status: "pending" },
              { sort: "created_date", limit: 20 }
            )
          : base44.entities.LiveRequest.filter(
              { room_id: id, viewer_email: user.email },
              { sort: "-created_date", limit: 1 }
            ),
      ]);
      setViewers(Number(count) || 0);
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

  // leaving the screen takes the viewer out of the audience count
  useEffect(
    () => () => {
      if (approvedRef.current) {
        base44.entities.LiveRequest.update(approvedRef.current, { status: "left" }).catch(() => {});
      }
    },
    []
  );

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

  const leaveRoom = async () => {
    if (myRequest?.status === "approved") {
      await base44.entities.LiveRequest.update(myRequest.id, { status: "left" });
    }
    navigate("/reels");
  };

  const endLive = async () => {
    await base44.entities.LiveRoom.update(room.id, { status: "ended", ended_at: new Date().toISOString() });
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

  const isHost = room.host_email === me.email;
  const ended = room.status === "ended";
  const approved = myRequest?.status === "approved";
  const canChat = !ended && (isHost || approved);
  const canGift = !ended && !isHost && approved;

  return (
    <div className="relative flex h-[100dvh] w-full flex-col gap-3 overflow-hidden bg-foreground px-4 pb-4 pt-[max(0.6rem,env(safe-area-inset-top))] text-background">
      <header className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={isHost ? endLive : leaveRoom}
          aria-label={isHost ? "End live" : "Leave"}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10"
        >
          {isHost ? <X className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
        </button>
        <p className="min-w-0 flex-1 truncate text-[15px] font-semibold">
          {isHost ? "Your live" : `@${room.host_username || "friend"}`}
        </p>
        <span className="flex shrink-0 items-center gap-1 text-[12px] text-white/60">
          <Coins className="h-3.5 w-3.5 text-accent" />
          {balanceOf(profile)}
        </span>
      </header>

      {ended ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-[15px] text-white/70">This live has ended.</p>
          <button
            type="button"
            onClick={() => navigate("/reels")}
            className="rounded-full bg-white/15 px-5 py-2.5 text-[13px] font-medium"
          >
            Back to reels
          </button>
        </div>
      ) : (
        <>
          <LiveStage
            room={room}
            isHost={isHost}
            viewers={viewers}
            requests={requests}
            myRequest={myRequest}
            busy={busy}
            onRequest={requestToJoin}
            onCancel={cancelRequest}
            onApprove={(request) => decide(request, "approved")}
            onDecline={(request) => decide(request, "declined")}
          />
          <LiveChat
            room={room}
            me={me}
            username={profile?.username}
            canChat={canChat}
            canGift={canGift}
            onGift={sendGift}
            gifting={gifting}
          />
          {isHost ? (
            <button
              type="button"
              onClick={endLive}
              className="shrink-0 rounded-full bg-destructive px-5 py-2.5 text-[13px] font-semibold text-destructive-foreground"
            >
              End live
            </button>
          ) : null}
        </>
      )}

      {/* live is portrait only — landscape turns the phone into a "rotate back" screen */}
      <div className="live-rotate-hint fixed inset-0 z-50 flex-col items-center justify-center gap-3 bg-foreground text-center">
        <p className="text-[15px] font-semibold">Turn your phone upright</p>
        <p className="text-[13px] text-white/60">Live works in portrait.</p>
      </div>
    </div>
  );
}