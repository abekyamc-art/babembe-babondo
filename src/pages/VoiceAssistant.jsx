import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Phone, PhoneOff, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import useVoiceAgent from "@/hooks/useVoiceAgent";
import {
  DAILY_LIMIT,
  GUEST_LIMIT,
  addGuestStamp,
  creditsFrom,
  getGuestStamps,
  liveStamps,
  loadUserStamps,
  pruneUsage,
  releaseOldestMessages,
  spendCredit,
} from "@/lib/usage";
import { ensureProfile } from "@/lib/social";
import {
  MESSAGE_COST,
  MESSAGES_PER_COIN,
  balanceOf,
  owedMessages,
  spendCoins,
  writeOwedMessages,
} from "@/lib/coins";
import OrbVisualizer from "@/components/voice/OrbVisualizer";
import ChatInput from "@/components/voice/ChatInput";
import ConversationStrip from "@/components/voice/ConversationStrip";
import UsagePill from "@/components/voice/UsagePill";
import GateDialog from "@/components/voice/GateDialog";
import AccountIcon from "@/components/voice/AccountIcon";
import AccountSheet from "@/components/voice/AccountSheet";
import KnowledgeSheet from "@/components/knowledge/KnowledgeSheet";

export default function VoiceAssistant() {
  const orbVideoRef = useRef(null);
  const {
    status,
    speaking,
    thinking,
    micActive,
    turns,
    error,
    notice,
    levelRef,
    avatarReady,
    avatarLive,
    start,
    stop,
  } = useVoiceAgent({ videoRef: orbVideoRef });
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [stamps, setStamps] = useState([]);
  const [clock, setClock] = useState(() => Date.now());
  const [gate, setGate] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const [refilling, setRefilling] = useState(false);
  const [refillError, setRefillError] = useState("");
  const pendingGate = useRef(false);
  // how many of the messages a coin bought are still to be answered
  const owedRef = useRef(0);

  const limit = user ? DAILY_LIMIT : GUEST_LIMIT;
  const { remaining, nextReturnAt } = creditsFrom(stamps, limit, clock);
  const used = limit - remaining;

  useEffect(() => {
    let alive = true;
    (async () => {
      let me = null;
      try {
        me = await base44.auth.me();
      } catch (err) {
        me = null;
      }
      if (!alive) return;
      setUser(me);
      try {
        if (me) {
          ensureProfile(me)
            .then((mine) => {
              if (alive) setProfile(mine);
            })
            .catch(() => {});
          setStamps(await loadUserStamps(me.email));
          owedRef.current = owedMessages(me.email);
          pruneUsage(me.email).catch(() => {});
        } else {
          setStamps(getGuestStamps());
        }
      } catch (err) {
        setStamps([]);
      }
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // the allowance keeps itself current, so a returning message appears without a reload
  useEffect(() => {
    if (!ready) return undefined;
    const sync = () => setClock(Date.now());
    const id = setInterval(sync, 30000);
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ready]);

  // once the last allowed turn is used, prompt when the answer has finished
  useEffect(() => {
    if (!pendingGate.current || micActive || speaking || status === "connecting") return undefined;
    const timer = setTimeout(() => {
      if (!pendingGate.current) return;
      pendingGate.current = false;
      setRefillError("");
      setGate(user ? "daily" : "signin");
    }, 1400);
    return () => clearTimeout(timer);
  }, [turns, speaking, micActive, status, user]);

  // a message is only spent once the assistant has actually answered
  const consume = useCallback(async () => {
    const now = Date.now();
    let next;
    try {
      if (user) {
        const stamp = await spendCredit(user.email);
        next = [...liveStamps(stamps, now), stamp];
      } else {
        next = addGuestStamp();
      }
    } catch (err) {
      next = [...liveStamps(stamps, now), now];
    }
    setStamps(next);
    setClock(now);
    return next.length;
  }, [user, stamps]);

  // the coin leaves the wallet only once the fourth of the messages it bought is answered
  const settle = useCallback(async () => {
    if (owedRef.current <= 0) return;
    const left = owedRef.current - 1;
    owedRef.current = left;
    writeOwedMessages(user?.email, left);
    if (left > 0) return;
    try {
      const spent = await spendCoins(await ensureProfile(user), MESSAGE_COST);
      if (spent) setProfile(spent);
    } catch (err) {
      // the four messages stay given rather than the answer being lost
    }
  }, [user]);

  const spend = useCallback(async () => {
    const live = await consume();
    if (live >= limit) pendingGate.current = true;
    await settle();
  }, [consume, limit, settle]);

  const openGate = useCallback(() => {
    setGate(user ? "daily" : "signin");
  }, [user]);

  const handleCall = async () => {
    if (status === "connecting" || !ready) return;
    if (micActive) {
      await stop();
      return;
    }
    if (remaining <= 0) {
      openGate();
      return;
    }
    const wasLive = status === "live";
    if (wasLive) await stop();
    await start({ withMic: true, onAnswered: spend });
  };

  const handleSend = async (text) => {
    if (!ready) return;
    if (remaining <= 0) {
      openGate();
      return;
    }
    await start({ withMic: false, silent: true, firstMessage: text, onAnswered: spend });
  };

  const handleAccount = () => setAccountOpen(true);

  const handleKnowledge = () => {
    setAccountOpen(false);
    setKnowledgeOpen(true);
  };

  const handleReels = () => {
    setAccountOpen(false);
    navigate("/reels");
  };

  const handleMarkets = () => {
    setAccountOpen(false);
    navigate("/markets");
  };

  const handleMessages = () => {
    setAccountOpen(false);
    navigate("/messages");
  };

  // a coin buys four messages and stays in the wallet until the fourth of them is answered
  const handleRefill = async () => {
    if (!user || refilling) return;
    if (!profile) {
      setRefillError("Your wallet hasn't loaded yet — try again in a moment.");
      return;
    }
    if (balanceOf(profile) < MESSAGE_COST) {
      setRefillError(
        `You have no coins — get coins to unlock ${MESSAGES_PER_COIN} more messages.`
      );
      return;
    }
    setRefillError("");
    setRefilling(true);
    try {
      await releaseOldestMessages(user.email, MESSAGES_PER_COIN);
      owedRef.current = MESSAGES_PER_COIN;
      writeOwedMessages(user.email, MESSAGES_PER_COIN);
      setStamps(await loadUserStamps(user.email));
      setClock(Date.now());
      pendingGate.current = false;
      setGate(null);
    } finally {
      setRefilling(false);
    }
  };

  // signing in happens on the app's own login page, which handles Google and returns home
  const handleGoogle = () => navigate("/login");

  // switch account signs out first, so Google shows its account chooser
  const handleSwitchAccount = async () => {
    await base44.auth.logout("/login");
  };

  const handleSignOut = async () => {
    await base44.auth.logout("/");
  };

  // the face is optional — without it the orb stays exactly as it has always been
  const faceNote = ready && !avatarReady ? "Face isn't connected yet — voice only for now." : "";

  const statusLabel =
    !ready
      ? "Checking…"
      : status === "connecting"
        ? "Connecting"
        : speaking
          ? "Speaking"
          : thinking
            ? "Thinking"
            : micActive
              ? "Listening"
              : status === "live"
                ? "Ready"
                : "Tap to talk";

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-background text-foreground">
      <div aria-hidden className="ambient-wash" />

      <header className="relative z-10 flex items-start justify-between gap-3 px-5 pt-[max(0.6rem,env(safe-area-inset-top))]">
        <div className="flex min-w-0 items-center gap-2 pt-1">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-foreground">
            <Sparkles className="h-3.5 w-3.5 text-background" />
          </span>
          <span className="truncate font-display text-[15px] tracking-tight">Babembe Babondo GS</span>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <UsagePill
            remaining={remaining}
            signedIn={!!user}
            ready={ready}
            nextReturnAt={nextReturnAt}
            nowMs={clock}
            onClick={handleAccount}
          />
          <AccountIcon label="Account" onClick={handleAccount} size="lg" />
        </div>
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-between gap-4 px-5">
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-7">
          <button
            type="button"
            onClick={handleCall}
            aria-label={micActive ? "End the call" : "Start a voice call"}
            className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-background"
          >
            <OrbVisualizer
              levelRef={levelRef}
              status={status}
              speaking={speaking}
              thinking={thinking}
              videoRef={orbVideoRef}
              faceOn={avatarLive}
            />
          </button>

          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleCall}
              aria-label={micActive ? "End the call" : "Start a voice call"}
              className={`grid h-16 w-16 place-items-center rounded-full shadow-md transition-all active:scale-95 ${
                micActive ? "bg-destructive text-destructive-foreground" : "bg-foreground text-background"
              }`}
            >
              {!ready || status === "connecting" ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : micActive ? (
                <PhoneOff className="h-6 w-6" />
              ) : (
                <Phone className="h-6 w-6" />
              )}
            </button>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {statusLabel}
            </p>
          </div>
        </div>

        {/* one fixed band holds the conversation and the status line, so nothing on screen moves */}
        <div className="flex h-[104px] w-full max-w-md shrink-0 flex-col gap-1.5 overflow-hidden">
          <div className="min-h-0 flex-1">
            <ConversationStrip turns={turns} />
          </div>
          <p
            aria-live="polite"
            className={`min-h-4 shrink-0 text-center text-[12px] leading-4 ${
              error ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {error || notice || faceNote}
          </p>
        </div>
      </main>

      <footer className="relative z-10 px-5 pb-6 pt-2">
        <ChatInput onSend={handleSend} onCall={handleCall} inCall={micActive} />
      </footer>

      <GateDialog
        open={gate !== null}
        variant={gate || "account"}
        used={used}
        limit={limit}
        signedIn={!!user}
        coins={balanceOf(profile)}
        refillCost={MESSAGE_COST}
        refillMessages={MESSAGES_PER_COIN}
        refillBusy={refilling}
        message={refillError}
        onRefill={handleRefill}
        onGoogle={handleGoogle}
        onSignOut={handleSignOut}
        onOpenChange={(next) => {
          if (next) return;
          setGate(null);
          setRefillError("");
        }}
      />

      <AccountSheet
        open={accountOpen}
        user={user}
        remaining={remaining}
        ready={ready}
        onSignIn={handleGoogle}
        onReels={handleReels}
        onMessages={handleMessages}
        onKnowledge={handleKnowledge}
        onGetCoins={handleMarkets}
        onSwitchAccount={handleSwitchAccount}
        onSignOut={handleSignOut}
        onClose={() => setAccountOpen(false)}
      />

      <KnowledgeSheet open={knowledgeOpen} onClose={() => setKnowledgeOpen(false)} />
    </div>
  );
}