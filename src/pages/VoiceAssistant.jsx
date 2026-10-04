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
  loadUserStamps,
  pruneUsage,
  spendCredit,
} from "@/lib/usage";
import { ensureProfile } from "@/lib/social";
import { loadVoiceMode, useVoiceMode } from "@/lib/voiceMode";
import { MESSAGE_COST, balanceOf, spendCoins } from "@/lib/coins";
import { primeMic } from "@/lib/micAccess";
import OrbVisualizer from "@/components/voice/OrbVisualizer";
import ChatInput from "@/components/voice/ChatInput";
import ConversationStrip from "@/components/voice/ConversationStrip";
import ThinkingLine from "@/components/voice/ThinkingLine";
import UsagePill from "@/components/voice/UsagePill";
import CoinPill from "@/components/voice/CoinPill";
import GateDialog from "@/components/voice/GateDialog";
import AccountIcon from "@/components/voice/AccountIcon";
import ModeToggle from "@/components/voice/ModeToggle";
import ModeBadge from "@/components/voice/ModeBadge";
import { providerClass, providerName } from "@/lib/providerNames";
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
    talkLabel,
    levelRef,
    avatarReady,
    avatarLive,
    start,
    stop,
  } = useVoiceAgent({ videoRef: orbVideoRef });
  const navigate = useNavigate();
  // the experience on screen follows the admin's switch, and every page the app shows
  // follows the same saved mode
  const mode = useVoiceMode();

  const [user, setUser] = useState(null);
  const [stamps, setStamps] = useState([]);
  const [clock, setClock] = useState(() => Date.now());
  const [gate, setGate] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const pendingGate = useRef(false);

  const limit = user ? DAILY_LIMIT : GUEST_LIMIT;
  const { remaining, nextReturnAt } = creditsFrom(stamps, limit, clock);
  const used = limit - remaining;

  // the wallet is the one place the balance lives: it is read again whenever the
  // screen comes back to the front, so the chip can never show a number the wallet
  // has already moved past
  const refreshWallet = useCallback(async () => {
    if (!user) return;
    try {
      setProfile(await ensureProfile(user));
    } catch (err) {
      // the chip keeps the balance it last read
    }
  }, [user]);

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
          pruneUsage(me.email).catch(() => {});
        } else {
          setStamps(getGuestStamps());
        }
      } catch (err) {
        setStamps([]);
      }
      // the admin's own setting decides who answers every call: the screen is not ready to
      // start one under a mode it has not read yet
      await loadVoiceMode();
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
      if (document.visibilityState !== "visible") return;
      sync();
      // the wallet may have moved while the app was away, so its number is read again
      refreshWallet();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ready, refreshWallet]);

  // once the free questions and the wallet are both used up, the prompt comes a
  // moment after the answer finishes — before the call's own quiet close
  useEffect(() => {
    if (!pendingGate.current || speaking || status === "connecting") return undefined;
    const timer = setTimeout(() => {
      if (!pendingGate.current) return;
      pendingGate.current = false;
      setGate(user ? "daily" : "signin");
    }, 1400);
    return () => clearTimeout(timer);
  }, [turns, speaking, status, user]);

  // a person can ask while a free daily question is left, or while the wallet holds coins
  const canAsk = remaining > 0 || balanceOf(profile) > 0;

  // an answer is only charged once the assistant has actually given it. The free
  // daily questions are read fresh and used first; only when none is left does the
  // answer take a coin, and that coin does not come back.
  const spend = useCallback(async () => {
    const now = Date.now();
    try {
      if (!user) {
        const next = addGuestStamp();
        setStamps(next);
        setClock(now);
        if (creditsFrom(next, GUEST_LIMIT, now).remaining <= 0) pendingGate.current = true;
        return;
      }

      // read from the server, so a long call never spends one free question twice
      const live = await loadUserStamps(user.email);
      if (creditsFrom(live, DAILY_LIMIT, now).remaining > 0) {
        const stamp = await spendCredit(user.email);
        const next = [...live, stamp];
        setStamps(next);
        setClock(now);
        // the free questions are gone: the prompt is due unless the wallet can pay
        if (creditsFrom(next, DAILY_LIMIT, now).remaining <= 0) {
          const wallet = await ensureProfile(user);
          setProfile(wallet);
          if (balanceOf(wallet) <= 0) pendingGate.current = true;
        }
        return;
      }

      const wallet = await ensureProfile(user);
      const spent = await spendCoins(wallet, MESSAGE_COST);
      if (spent) setProfile(spent);
      setClock(now);
      if (balanceOf(spent || wallet) <= 0) pendingGate.current = true;
    } catch (err) {
      // a charge that cannot be counted never loses the answer that was given
      setClock(now);
    }
  }, [user]);

  const openGate = useCallback(() => {
    setGate(user ? "daily" : "signin");
  }, [user]);

  const handleCall = async () => {
    if (status === "connecting" || !ready) return;
    if (micActive) {
      await stop();
      return;
    }
    if (!canAsk) {
      openGate();
      return;
    }
    // the microphone and the sound are asked for inside the tap itself — the one moment a phone
    // accepts that ask — and the call opening a moment later listens through what the tap opened
    primeMic();
    const wasLive = status === "live";
    if (wasLive) await stop();
    await start({ withMic: true, onAnswered: spend });
  };

  const handleSend = async (text) => {
    if (!ready) return;
    if (!canAsk) {
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

  const handleRap = () => {
    setAccountOpen(false);
    navigate("/rap");
  };

  const handleMarkets = () => {
    setAccountOpen(false);
    navigate("/markets");
  };

  // the coin chip and the prompt both open the wallet straight away
  const handleCoins = () => {
    setGate(null);
    navigate("/markets");
  };

  const handleMessages = () => {
    setAccountOpen(false);
    navigate("/messages");
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
    <div
      className={`relative flex h-full w-full flex-col overflow-hidden bg-background text-foreground ${providerClass(mode)}`}
    >
      <div aria-hidden className="ambient-wash" />

      <header className="relative z-10 flex items-start justify-between gap-3 px-5 pt-[max(0.6rem,env(safe-area-inset-top))]">
        <div className="flex min-w-0 items-center gap-2 pt-1">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-foreground">
            <Sparkles className="h-3.5 w-3.5 text-background" />
          </span>
          <span className="truncate font-display text-[15px] tracking-tight">Babembe Babondo GS</span>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          {user?.role === "admin" ? <ModeToggle /> : null}
          <UsagePill
            remaining={remaining}
            signedIn={!!user}
            ready={ready}
            nextReturnAt={nextReturnAt}
            nowMs={clock}
            onClick={handleAccount}
          />
          {user && profile ? (
            <CoinPill coins={balanceOf(profile)} onClick={handleCoins} />
          ) : null}
          <AccountIcon label="Account" onClick={handleAccount} size="lg" />
        </div>
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-between gap-4 px-5">
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-7">
          {/* who answers is written on the screen itself: the whole page changes with the switch */}
          <ModeBadge mode={mode} talk={talkLabel} />
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
            <ConversationStrip turns={turns} pending={thinking} />
          </div>
          <p
            aria-live="polite"
            className={`min-h-4 shrink-0 text-center text-[12px] leading-4 ${
              error ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {error ||
              notice ||
              faceNote ||
              `${talkLabel || providerName(mode)} answers each turn.`}
          </p>
        </div>
      </main>

      <footer className="relative z-10 px-5 pb-6 pt-2">
        {/* the same progress as the conversation, over the box, with its room kept so
            nothing on the screen moves when it comes and goes */}
        <div className="flex h-5 items-center justify-center">
          {thinking ? <ThinkingLine /> : null}
        </div>
        <ChatInput onSend={handleSend} onCall={handleCall} inCall={micActive} />
      </footer>

      <GateDialog
        open={gate !== null}
        variant={gate || "account"}
        used={used}
        limit={limit}
        signedIn={!!user}
        coins={balanceOf(profile)}
        onGetCoins={handleCoins}
        onGoogle={handleGoogle}
        onSignOut={handleSignOut}
        onOpenChange={(next) => {
          if (next) return;
          setGate(null);
        }}
      />

      <AccountSheet
        open={accountOpen}
        user={user}
        remaining={remaining}
        ready={ready}
        wallet={profile}
        onSignIn={handleGoogle}
        onReels={handleReels}
        onMessages={handleMessages}
        onRap={handleRap}
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