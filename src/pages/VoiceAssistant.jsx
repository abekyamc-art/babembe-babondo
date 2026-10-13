import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Languages, Loader2, Phone, PhoneOff, Radio, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import useHomeVoice from "@/hooks/useHomeVoice";
import useStoryTurn from "@/hooks/useStoryTurn";
import { noteKibembeSession } from "@/lib/kpiEvents";
import {
  DAILY_LIMIT,
  GUEST_LIMIT,
  addGuestStamp,
  creditsFrom,
  getGuestStamps,
  loadUserStamps,
  pruneUsage,
  spendCredit } from
"@/lib/usage";
import { ensureProfile } from "@/lib/social";
import { MESSAGE_COST, balanceOf, spendCoins } from "@/lib/coins";
import OrbVisualizer from "@/components/voice/OrbVisualizer";
import ChatInput from "@/components/voice/ChatInput";
import ConversationStrip from "@/components/voice/ConversationStrip";
import MediaDock from "@/components/media/MediaDock";
import SaveAsk from "@/components/voice/SaveAsk";
import HeardAsk from "@/components/voice/HeardAsk";
import ThinkingLine from "@/components/voice/ThinkingLine";
import UsagePill from "@/components/voice/UsagePill";
import CoinPill from "@/components/voice/CoinPill";
import GateDialog from "@/components/voice/GateDialog";
import AccountIcon from "@/components/voice/AccountIcon";
import ModeBadge from "@/components/voice/ModeBadge";
import LangPill from "@/components/voice/LangPill";
import { CARTESIA_AI, CARTESIA_AI1, CARTESIA_AI2, KIBEMBE_CLASS } from "@/lib/providerNames";
import AccountSheet from "@/components/voice/AccountSheet";
import PlaybackCheck from "@/components/voice/PlaybackCheck";
import KnowledgeSheet from "@/components/knowledge/KnowledgeSheet";
import { HOME_SEATS } from "@/lib/homeRotation";
import StorySheet from "@/components/story/StorySheet";
import StoryRail from "@/components/story/StoryRail";
import ExamLauncher from "@/components/exam/ExamLauncher";
import GameLauncher from "@/components/diffgame/GameLauncher";
import SeriesShell from "@/components/exam/SeriesShell";

// the outside voice the call hands over to on its own carries its own mark; the older talk AIs
// carry the app's own, so who is answering is seen at a glance and not only read in the line
// beneath it
const VOICE_ICONS = { [CARTESIA_AI]: Radio, [CARTESIA_AI1]: Radio, [CARTESIA_AI2]: Radio };

export default function VoiceAssistant() {
  const {
    status,
    speaking,
    thinking,
    micActive,
    turns,
    error,
    notice,
    levelRef,
    voiceLabel,
    waiting,
    start,
    stop,
    ask,
    correctTurn,
    heardAsk,
    acceptHeard,
    againHeard,
    saveAsk,
    keepSave,
    leaveSave,
    media
  } = useHomeVoice();
  const navigate = useNavigate();

  // the admin's own story for what the person asks: it is brought on screen during the call, and
  // playing what it carries ends the call
  const { story, closeStory } = useStoryTurn(turns);

  const [user, setUser] = useState(null);
  const [stamps, setStamps] = useState([]);
  const [clock, setClock] = useState(() => Date.now());
  const [gate, setGate] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  // the walk of the whole ring, checking the app's own song playback on each AI in turn
  const [checkOpen, setCheckOpen] = useState(false);
  // the whole examination series stands over the call screen, which it never touches
  const [levelsOpen, setLevelsOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState(null);
  // the story picked out of the middle strip, shown in the same sheet the assistant's own stories use
  const [pickedStory, setPickedStory] = useState(null);
  // a nudge to read the strip again once the admin has written a story
  const [storiesKey, setStoriesKey] = useState(0);
  const pendingGate = useRef(false);
  // the session is counted once, on the first turn asked of it — the microphone or a written message
  const countedRef = useRef(false);

  const noteFirstAsk = useCallback(() => {
    if (countedRef.current) return;
    countedRef.current = true;
    noteKibembeSession();
  }, []);

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
    }}, [user]);

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
          ensureProfile(me).
          then((mine) => {
            if (alive) setProfile(mine);
          }).
          catch(() => {});
          setStamps(await loadUserStamps(me.email));
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
    // the microphone and the sound are asked for inside the tap itself, in the engine that opens
    // a moment later
    noteFirstAsk();
    await start({ onAnswered: spend });
  };

  const handleSend = async (text) => {
    if (!ready) return;
    if (!canAsk) {
      openGate();
      return;
    }
    noteFirstAsk();
    await ask(text, spend);
  };

  // A piece of the artist's own, tapped in the list under an answer: it is played in the app's own
  // player rather than opening YouTube, with the artist's other listed pieces waiting behind it.
  const handlePlayVideo = (row, rows) => media.play(row, rows);

  // a story picked out of the middle strip opens in the sheet the assistant's own stories use
  const openStory = (next) => {
    closeStory();
    setPickedStory(next);
  };

  const shutStory = () => {
    setPickedStory(null);
    closeStory();
  };

  const handleAccount = () => setAccountOpen(true);

  const handleKnowledge = () => {
    setAccountOpen(false);
    setKnowledgeOpen(true);
  };

  const handlePlaybackCheck = () => {
    setAccountOpen(false);
    setCheckOpen(true);
  };

  const handleReels = () => {
    setAccountOpen(false);
    navigate("/reels");
  };

  const handleStudio = () => {
    setAccountOpen(false);
    navigate("/studio");
  };

  const handleKibembe = () => {
    setAccountOpen(false);
    navigate("/kibembe");
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

  const statusLabel =
  !ready ?
  "Checking…" :
  status === "connecting" ?
  "Connecting" :
  speaking ?
  "Speaking" :
  thinking ?
  "Thinking" :
  micActive ?
  "Listening" :
  waiting ?
  "Tap to continue" :
  "Tap to talk";

  return (
    <div
      className={`relative flex h-full w-full flex-col overflow-hidden bg-background text-foreground ${KIBEMBE_CLASS}`}>
      
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
            onClick={handleAccount} />
          
          {user && profile ?
          <CoinPill coins={balanceOf(profile)} onClick={handleCoins} /> :
          null}
          <AccountIcon label="Account" onClick={handleAccount} size="lg" />
        </div>
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-between gap-4 px-5">
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-7">
          {/* who answers, and the language they are answering in, are written on the screen itself:
               the language stands until the person changes it, here or by asking for one out loud */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <ModeBadge icon={VOICE_ICONS[voiceLabel] || Languages} label={`${voiceLabel} answers`} />
            <LangPill />
          </div>
          <button
            type="button"
            onClick={handleCall}
            aria-label={micActive ? "End the call" : "Start a voice call"}
            className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-background">
            
            <OrbVisualizer
              levelRef={levelRef}
              status={status}
              speaking={speaking}
              thinking={thinking} />
            
          </button>

          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleCall}
              aria-label={micActive ? "End the call" : "Start a voice call"}
              className={`grid h-16 w-16 place-items-center rounded-full shadow-md transition-all active:scale-95 ${
              micActive ? "bg-destructive text-destructive-foreground" : "bg-foreground text-background"}`
              }>
              
              {!ready || status === "connecting" ?
              <Loader2 className="h-6 w-6 animate-spin" /> :
              micActive ?
              <PhoneOff className="h-6 w-6" /> :

              <Phone className="h-6 w-6" />
              }
            </button>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground [font-family:'Albert_Sans',_sans-serif] font-bold">
              {statusLabel}
            </p>
          </div>
        </div>

        {/* the admin's own stories stand in the middle of the screen, so what the app has been told
             is met before it is asked for; a tap opens the story itself with its media */}
        <StoryRail onOpen={openStory} refresh={storiesKey} />

        {/* one fixed band holds the conversation and the status line, so nothing on screen moves */}
        <div className="flex h-[104px] w-full max-w-md shrink-0 flex-col gap-1.5 overflow-hidden">
          <div className="min-h-0 flex-1">
            <ConversationStrip
              turns={turns}
              pending={thinking}
              onCorrectTurn={correctTurn}
              onPick={handleSend}
              onPlayVideo={handlePlayVideo} />
            
          </div>
          {/* what the app would keep from a turn the person has put right: their own answer saves it */}
          {heardAsk ?
          <HeardAsk ask={heardAsk} onUse={acceptHeard} onAgain={againHeard} /> : saveAsk ?
          <SaveAsk ask={saveAsk} onKeep={keepSave} onLeave={leaveSave} /> :

          <p
            aria-live="polite"
            className="min-h-4 shrink-0 text-center text-[12px] leading-4 text-muted-foreground">
            
              <span className={`block${error ? " text-destructive" : ""}`}>
                {error || notice || media.note || `${voiceLabel} answers each turn.`}
              </span>
              {/* the app's own line about its own player stands beside the voice's own line, so a
                  request that found nothing, or a title it could not choose between, is read even
                  where a line of the voice's own is standing above it */}
              {media.note && (error || notice) ? <span className="block">{media.note}</span> : null}
            </p>
          }
        </div>
      </main>

      {/* the app's own player, standing over the talk: what the person asked for plays here, in the
           artist's own piece, and the app's own line says only what it has really done */}
      {media.item || media.offer.length ? (
        <div className="absolute inset-x-4 bottom-[5.5rem] z-30 mx-auto max-w-md overflow-hidden rounded-2xl border border-border bg-card/95 shadow-lg backdrop-blur">
          <MediaDock
            item={media.item}
            queue={media.queue}
            others={media.others}
            offer={media.offer}
            note={media.note}
            onPick={(one) => media.play(one, media.offer)}
            playing={media.started}
            autoStart={media.autoStart}
            playerRef={media.playerRef}
            onStart={media.onStart}
            onPlaying={media.onPlaying}
            onTrackEnd={media.onTrackEnd}
            onNext={media.onNext}
            onClose={media.onClose}
          />
        </div>
      ) : null}

      <footer className="relative z-10 px-5 pb-6 pt-2">
        {/* the same progress as the conversation, over the box, with its room kept so
             nothing on the screen moves when it comes and goes */}
        <div className="flex h-5 items-center justify-center">
          {thinking ? <ThinkingLine /> : null}
        </div>
        {/* every examination is met in one place: the seal keeps to the lower left of the home
             screen, beside the message box, before anything is asked of the call itself */}
        <div className="flex items-center gap-2">
          <ExamLauncher onOpen={() => setLevelsOpen(true)} />
          {/* the app's own game stands beside the examination's seal, in the same reach of the thumb */}
          <GameLauncher />
          <div className="min-w-0 flex-1">
            <ChatInput onSend={handleSend} onCall={handleCall} inCall={micActive} />
          </div>
        </div>
      </footer>

      <SeriesShell open={levelsOpen} onClose={() => setLevelsOpen(false)} />

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
        }} />
      

      <AccountSheet
        open={accountOpen}
        user={user}
        remaining={remaining}
        ready={ready}
        wallet={profile}
        onSignIn={handleGoogle}
        onReels={handleReels}
        onMessages={handleMessages}
        onStudio={handleStudio}
        onKibembe={handleKibembe}
        onKnowledge={handleKnowledge}
        onPlaybackCheck={handlePlaybackCheck}
        onGetCoins={handleMarkets}
        onSwitchAccount={handleSwitchAccount}
        onSignOut={handleSignOut}
        onClose={() => setAccountOpen(false)} />
      

      <StorySheet story={pickedStory || story} onClose={shutStory} onPlaybackEnd={stop} />

      <KnowledgeSheet
        open={knowledgeOpen}
        onClose={() => {
          setKnowledgeOpen(false);
          setStoriesKey((count) => count + 1);
        }} />

      <PlaybackCheck
        open={checkOpen}
        onClose={() => setCheckOpen(false)}
        seats={HOME_SEATS}
        voiceLabel={voiceLabel}
        micActive={micActive}
        turns={turns}
        media={media} />
      
    </div>);

}