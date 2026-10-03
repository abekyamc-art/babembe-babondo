import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Phone, PhoneOff, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import useVoiceAgent from "@/hooks/useVoiceAgent";
import {
  DAILY_LIMIT,
  GUEST_LIMIT,
  bumpDailyUsed,
  bumpGuestUsed,
  getDailyUsed,
  getGuestUsed,
} from "@/lib/usage";
import OrbVisualizer from "@/components/voice/OrbVisualizer";
import ChatInput from "@/components/voice/ChatInput";
import ConversationStrip from "@/components/voice/ConversationStrip";
import UsagePill from "@/components/voice/UsagePill";
import GateDialog from "@/components/voice/GateDialog";

export default function VoiceAssistant() {
  const { status, speaking, micActive, turns, error, levelRef, start, stop } = useVoiceAgent();

  const [user, setUser] = useState(null);
  const [used, setUsed] = useState(0);
  const [gate, setGate] = useState(null);
  const [ready, setReady] = useState(false);
  const [signinBusy, setSigninBusy] = useState(false);
  const [signinError, setSigninError] = useState("");
  const pendingGate = useRef(false);

  const limit = user ? DAILY_LIMIT : GUEST_LIMIT;
  const remaining = Math.max(0, limit - used);

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
        setUsed(me ? await getDailyUsed(me.email) : getGuestUsed());
      } catch (err) {
        setUsed(0);
      }
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // once the last allowed turn is used, prompt when the answer has finished
  useEffect(() => {
    if (!pendingGate.current || micActive || speaking || status === "connecting") return undefined;
    const timer = setTimeout(() => {
      if (!pendingGate.current) return;
      pendingGate.current = false;
      setGate(user ? "daily" : "signin");
    }, 1400);
    return () => clearTimeout(timer);
  }, [turns, speaking, micActive, status, user]);

  // counting a message must never stop the call from starting
  const consume = useCallback(async () => {
    try {
      if (user) {
        setUsed(await bumpDailyUsed(user.email));
      } else {
        setUsed(bumpGuestUsed());
      }
    } catch (err) {
      setUsed((value) => value + 1);
    }
  }, [user]);

  const openGate = useCallback(() => {
    setSigninError("");
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
    if (remaining - 1 <= 0) pendingGate.current = true;
    const wasConnected = status === "live";
    await consume();
    if (wasConnected) await stop();
    await start({ withMic: true });
  };

  const handleSend = async (text) => {
    if (!ready) return;
    if (remaining <= 0) {
      openGate();
      return;
    }
    if (remaining - 1 <= 0) pendingGate.current = true;
    await consume();
    await start({ withMic: false, firstMessage: text });
  };

  const handlePill = () => {
    if (!ready) return;
    setSigninError("");
    if (remaining > 0) setGate("account");
    else openGate();
  };

  const handleGoogle = async () => {
    setSigninBusy(true);
    setSigninError("");
    try {
      await base44.auth.loginWithProvider("google", window.location.href);
    } catch (err) {
      setSigninError(err?.message || "Google sign-in is unavailable right now.");
      setSigninBusy(false);
    }
  };

  const handleSignOut = async () => {
    await base44.auth.logout(window.location.href);
  };

  const statusLabel =
    !ready
      ? "Checking…"
      : status === "connecting"
        ? "Connecting"
        : speaking
          ? "Speaking"
          : micActive
            ? "Listening"
            : status === "live"
              ? "Ready"
              : "Tap to talk";

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-background text-foreground">
      <div aria-hidden className="ambient-wash" />

      <header className="relative z-10 flex items-center justify-between px-5 pt-6">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-foreground">
            <Sparkles className="h-3.5 w-3.5 text-background" />
          </span>
          <span className="font-display text-[15px] tracking-tight">Village Voice</span>
        </div>
        <UsagePill remaining={remaining} signedIn={!!user} ready={ready} onClick={handlePill} />
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-5">
        <div className="flex flex-col items-center gap-7">
          <OrbVisualizer levelRef={levelRef} status={status} speaking={speaking} />

          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleCall}
              aria-label={micActive ? "End the call" : "Start a voice call"}
              className={`grid h-16 w-16 place-items-center rounded-full shadow-md transition-all active:scale-95 ${
                micActive ? "bg-destructive text-destructive-foreground" : "bg-foreground text-background"
              }`}
            >
              {status === "connecting" ? (
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

        <ConversationStrip turns={turns} />

        {error ? <p className="max-w-xs text-center text-[12px] text-destructive">{error}</p> : null}
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
        busy={signinBusy}
        message={signinError}
        onGoogle={handleGoogle}
        onSignOut={handleSignOut}
        onOpenChange={(next) => {
          if (!next) setGate(null);
        }}
      />
    </div>
  );
}