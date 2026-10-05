import { useCallback, useEffect, useRef, useState } from "react";
import VoiceSocket from "@/lib/elevenLabsSocket";
import Base44Call from "@/lib/base44Call";
import AvatarCall from "@/lib/avatarCall";
import { dropMic } from "@/lib/micAccess";
import { useVoiceMode, voiceMode } from "@/lib/voiceMode";
import { providerName } from "@/lib/providerNames";
import { base44 } from "@/api/base44Client";
import { buildMemory } from "@/lib/agentMemory";
import { loadFreshMaterial, loadKnowledgeNote, withKnowledge } from "@/lib/knowledge";
import { emptyStory, nextStory, withStory } from "@/lib/storyState";
import { closeWords, wordsNote } from "@/lib/helperWords";
import { heardLanguage } from "@/lib/heardLanguage";
import { withoutCues } from "@/lib/cues";
import { askCoordinator } from "@/lib/handoffSignal";
import {
  FIRST_TALK,
  TALK_ANSWERS,
  handoffNotice,
  noSignalNotice,
  stuckNotice,
} from "@/lib/talkRotation";

// the knowledge note travels in blocks and needs a beat to settle before the
// question is put to him, so he reads it before he answers; the wait is shown as
// him working
const TYPED_HOLD_MS = 8000;

// knowledge held back while he is answering is kept to this much, so an answer that never
// ends can never let what is waiting grow without bound
const HELD_LIMIT = 4000;

// a turn the AI on air has not so much as begun answering is a person left in silence: after
// this long the same turn is handed to the next talk AI in order, so a stalled AI never holds
// the conversation
const STUCK_MS = 4000;

// a turn nothing could be read from: no note, no language said, no greeting, nothing left open
const EMPTY_READ = { note: "", lang: "", greeting: false, missing: false };

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One session's handlers. Every report they carry is checked against the number the session
 * was opened under, so a session the admin has already switched away from — including one
 * still finishing an answer it began before the switch — says nothing on screen and is never
 * charged for.
 */
function forSession(handlers, gen, live) {
  const wrapped = {};
  Object.keys(handlers).forEach((key) => {
    wrapped[key] = (...args) => {
      if (gen !== live.current) return;
      handlers[key](...args);
    };
  });
  return wrapped;
}

export default function useVoiceAgent({ videoRef } = {}) {
  const socketRef = useRef(null);
  const levelRef = useRef(0);
  const rafRef = useRef(0);
  // the answer is always charged through the handler as the allowance stands right
  // now, not the one captured when the conversation first opened
  const answeredRef = useRef(null);
  // whether the owner's face is available at all; the answer arrives once, on load
  const faceReadyRef = useRef(false);
  // whether the session on air is a written one, which ends without call language
  const quietRef = useRef(false);
  // everything he has already said, in order, so a later session is never a blank one
  const linesRef = useRef([]);
  // the typed line already on screen, so the agent's own echo of it is not shown twice
  const sentRef = useRef("");
  // the spoken turn already looked up, so one turn is never read twice
  const heardRef = useRef({ text: "", timer: 0 });
  // knowledge that landed while he was answering, waiting for his voice to stop
  const heldRef = useRef("");
  // the last turn the person took that no answer followed: the next call opens by
  // answering it
  const pendingRef = useRef("");
  // the story being told in parts, so a call that opens later continues it instead
  // of starting it over
  const storyRef = useRef(emptyStory());
  // which session is the one on air. Every engine reports through handlers stamped with the
  // number they were opened under, and anything arriving under an older number is dropped, so
  // a provider the admin has switched away from cannot answer, charge, or speak again.
  const sessionRef = useRef(0);
  // whether the session on air has actually been picked up, so a call that ends by itself can be
  // told apart from one that never opened
  const liveRef = useRef(false);
  // the wait put on the turn the AI on air is holding: armed when the turn reaches it and cancelled
  // the moment its answer begins, so only a real stall moves the turn on
  const stuckTimerRef = useRef(0);
  // the turn already handed on for a stall, so one turn is never moved twice
  const stuckTurnRef = useRef("");
  // the move itself, kept in a ref because a timer is what sends it
  const stuckRunRef = useRef(null);

  // the talk AI answering right now, and how many answers it has given: the home page's four talk
  // AIs take turns, two answers each, and the fifth AI signals the change
  const talkRef = useRef({ ...FIRST_TALK, answered: 0 });
  // a handoff the second answer has asked for, waiting for that answer to finish being read out
  const handoffDueRef = useRef(false);
  // the signal for that handoff, asked for while the second answer was still being given, so the
  // change of AI is a breath rather than a wait
  const signalRef = useRef(null);
  // the handoff itself, kept in a ref because an answer's own handler is what sends it
  const handoffRunRef = useRef(null);

  // the mode in force, kept in step with the admin's switch: a switch ends whatever
  // session is on air, so the mode that was chosen is the only one left answering
  const mode = useVoiceMode();
  const [status, setStatus] = useState("idle");
  const [speaking, setSpeaking] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [turns, setTurns] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [avatarReady, setAvatarReady] = useState(false);
  const [avatarLive, setAvatarLive] = useState(false);
  // which talk AI is the one answering, written on the home screen and set by each handoff
  const [talkLabel, setTalkLabel] = useState("");

  useEffect(() => {
    let alive = true;
    base44.functions
      .invoke("liveAvatarSession", { probe: true })
      .then((res) => {
        if (!alive) return;
        const ready = !!res?.data?.ready;
        faceReadyRef.current = ready;
        setAvatarReady(ready);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // The admin's switch takes the other provider out of the room. Whichever session is on
  // air was opened under the mode that is no longer in force, so it is ended right here:
  // nothing said before the switch is answered by the provider that was just turned off,
  // and every turn after it is answered by the mode that was chosen.
  useEffect(() => {
    // Everything from before the switch belongs to the mode that is no longer in force: the
    // session on air is orphaned first, so none of its reports can land any more, and ended
    // straight after, so the provider just turned off stops talking — including one still
    // writing or speaking an answer it began before the switch.
    sessionRef.current += 1;
    const engine = socketRef.current;
    socketRef.current = null;
    heldRef.current = "";
    // the turn being waited on belonged to the mode just switched away from
    clearTimeout(stuckTimerRef.current);
    stuckTimerRef.current = 0;
    stuckTurnRef.current = "";
    setSpeaking(false);
    setThinking(false);
    setMicActive(false);
    setAvatarLive(false);
    setStatus("idle");
    if (engine) Promise.resolve(engine.stop?.()).catch(() => {});
    // the words helper was opened for the conversation that just ended
    closeWords().catch(() => {});
    // a change of mode starts the talk AIs over: the mode just chosen owns the conversation, and
    // its first talk AI opens the next call
    talkRef.current = { ...FIRST_TALK, answered: 0 };
    handoffDueRef.current = false;
    signalRef.current = null;
    setTalkLabel(mode === "agent" ? FIRST_TALK.label : "");
  }, [mode]);

  const pushTurn = useCallback((role, text) => {
    // a turn is answered by the reply that follows it, so the last unanswered one is
    // always the newest turn with no reply after it
    if (role === "user") {
      pendingRef.current = text;
      // a fresh turn is its own turn, so it may be moved on once if it is never answered
      stuckTurnRef.current = "";
    }
    if (role === "agent") pendingRef.current = "";
    if (role === "agent" && text) linesRef.current = [...linesRef.current, text];
    storyRef.current = nextStory(storyRef.current, role, text);
    setTurns((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role) {
        return [...prev.slice(0, -1), { role, text }];
      }
      return [...prev, { role, text }];
    });
  }, []);

  /**
   * A word he only heard is looked up as it lands — against the whole saved list,
   * including the words too long to ride along with the note — and what turns up
   * reaches the session before his answer, so a word that sounds close to a saved
   * one is answered from its meaning instead of being corrected.
   */
  /**
   * What the app itself makes of a turn, read on the server where the saved words are: the language
   * the person's own words are in — never guessed, and nothing claimed when the words do not say —
   * whether the turn is a greeting rather than a question, whether it left a place no saved word
   * accounts for, and the note of the words closest to what was heard. A turn is read once, however
   * many times it arrives.
   */
  const readTurn = useCallback(async (text) => {
    const said = String(text || "").trim();
    const state = heardRef.current;
    if (said.length < 3) return EMPTY_READ;
    if (said === state.text && state.read) return state.read;

    try {
      const res = await base44.functions.invoke("assistantKnowledge", { heard: said });
      const data = res?.data || {};
      const read = {
        note: String(data.note || ""),
        lang: String(data.lang || ""),
        greeting: !!data.greeting,
        missing: !!data.missing,
      };
      state.text = said;
      state.read = read;
      return read;
    } catch (err) {
      // the answer carries on without the extra words
      return EMPTY_READ;
    }
  }, []);

  /**
   * A turn that reached the session without the phone reading it first — a provider doing its own
   * listening — is read as soon as it lands, and what turns up reaches the session before his
   * answer, so a word that sounds close to a saved one is answered from its meaning instead of
   * being corrected.
   */
  const reviewHeard = useCallback(
    (text) => {
      const said = String(text || "").trim();
      const state = heardRef.current;
      if (said.length < 3 || said === state.text) return;

      clearTimeout(state.timer);
      state.timer = setTimeout(async () => {
        const read = await readTurn(said);
        const engine = socketRef.current;
        if (!read.note || !engine || engine.silent) return;
        // He is answering right now: the note is held instead of being lost, and handed
        // over the moment his voice stops, so it shapes the turn that follows — the one
        // that would otherwise be answered without the words he just said.
        if (engine.speaking) {
          heldRef.current = `${heldRef.current}\n${read.note}`.slice(-HELD_LIMIT);
          return;
        }
        engine.sendMemory?.(read.note);
      }, 350);
    },
    [readTurn]
  );

  /**
   * The material one turn needs from outside the saved knowledge — a story, news, a word, who
   * someone is. It is fetched by the turn itself and handed over with it, so an answer never
   * begins while the search for its question is still running. The lookup decides on the server
   * whether anything is needed, saves what it finds for next time, and hands back only the words
   * this answer uses: the material itself, or the line telling it to say plainly that nothing
   * could be confirmed.
   */
  const materialFor = useCallback(async (text) => {
    const said = String(text || "").trim();
    if (said.length < 3) return "";
    const { material } = await loadFreshMaterial(said);
    return material;
  }, []);

  /**
   * A turn that reached the session without the phone handing it over — a provider doing its own
   * listening — is looked up as soon as it lands, so the material still reaches the answer it
   * belongs to. A turn the phone handed over was looked up before it was sent, and the app's own
   * AI looks its own turns up while it writes them.
   */
  const reviewWanted = useCallback(
    async (text) => {
      const engine = socketRef.current;
      if (!engine || engine.selfLookup) return;
      const material = await materialFor(text);
      // material that arrives once he has started goes no further: it is saved for the
      // answers that follow instead of being pushed over the one being given
      if (material && socketRef.current === engine && !engine.silent && !engine.speaking) {
        engine.sendMemory?.(material);
      }
    },
    [materialFor]
  );

  /**
   * Knowledge that landed while he was answering is handed over the moment his voice
   * stops — never over the answer being given — so the turn that follows is answered
   * with the words just heard, and the language they were spoken in, already in hand.
   */
  const flushHeld = useCallback(() => {
    const held = heldRef.current;
    if (!held) return;
    const engine = socketRef.current;
    if (!engine || engine.silent || engine.speaking) return;
    heldRef.current = "";
    engine.sendMemory?.(held);
  }, []);

  /**
   * One answer given, counted against the talk AI that gave it. Two answers is what each of the
   * four gives before its break, and the second only asks for the handoff — the AI is never cut
   * off: its answer is read out in full, and the signal is sent once its voice has stopped. Only
   * a call that is heard counts, since a typed exchange is answered on screen and nobody's turn.
   */
  /**
   * The signal itself: the fifth AI is asked whose turn is next, and what it names is read on the
   * server against the four accounts the app is set up with. What comes back is the talk AI taking
   * the next two questions, or nothing at all when no signal could be used.
   */
  const requestHandoff = useCallback(async (from) => {
    try {
      const reply = await askCoordinator(from.label);
      if (!reply) return null;
      const res = await base44.functions.invoke("callHandoff", { reply, from: from.id });
      return res?.data?.next || null;
    } catch (err) {
      // a signal that cannot be asked for or read is no signal at all
      return null;
    }
  }, []);

  const countTalkAnswer = useCallback(() => {
    if (quietRef.current || voiceMode() !== "agent") return;
    const talk = talkRef.current;
    talk.answered += 1;
    if (talk.answered >= TALK_ANSWERS) {
      handoffDueRef.current = true;
      return;
    }
    // the signal is asked for while the second answer is still being given, so the AI taking the
    // next two questions is already known when that answer ends
    if (talk.answered === TALK_ANSWERS - 1 && !signalRef.current) {
      signalRef.current = requestHandoff({ ...talk });
    }
  }, [requestHandoff]);

  /** The wait on the turn the AI on air is holding ends here: nothing was stuck. */
  const clearStuck = useCallback(() => {
    if (stuckTimerRef.current) clearTimeout(stuckTimerRef.current);
    stuckTimerRef.current = 0;
  }, []);

  /**
   * The turn has just reached the AI on air. If it has not so much as begun answering within a few
   * seconds the person is left in silence, so that same turn is handed to the next talk AI in order.
   * Only a spoken call on one of the rotating talk AIs is watched — a typed turn, another mode's own
   * voice and the app's own AI are never moved on — and the wait is called off the moment an answer
   * begins, so an AI that is simply slow to speak is never taken off the turn.
   */
  const armStuck = useCallback(
    (engine, turn) => {
      clearStuck();
      const said = String(turn || "").trim();
      if (!engine || !said || engine.mode !== "agent" || !engine.micOn) return;
      // this turn has already been moved on once: it is never moved a second time
      if (stuckTurnRef.current === said) return;
      stuckTimerRef.current = setTimeout(() => {
        stuckTimerRef.current = 0;
        if (socketRef.current !== engine) return;
        // his answer has begun, in voice or in words: nothing was stuck
        if (engine.speaking || engine.answered || !engine.connected) return;
        stuckTurnRef.current = said;
        stuckRunRef.current?.(engine, said);
      }, STUCK_MS);
    },
    [clearStuck]
  );

  // both kinds of call report back through the same set of handlers
  const makeHandlers = useCallback(
    () => ({
      onStatus: (next) => {
        if (next === "live") {
          liveRef.current = true;
          setStatus("live");
        }
        if (next === "closed" || next === "ended") {
          // A session that ends on its own — the provider's doing, with the call already picked up
          // — is said plainly, so a call can never just go quiet with nothing said about why.
          if (next === "closed" && liveRef.current) {
            setNotice(`${providerName(voiceMode())}'s call ended on its own — tap and try again.`);
          } else if (next === "closed") {
            // the session died before it was ever answered: said plainly, so a call that cannot
            // open is never left looking like a call that simply has nothing to say
            setNotice("The call couldn't start — tap the orb and try again.");
          }
          liveRef.current = false;
          // the call is gone, so the wait on its turn goes with it
          clearStuck();
          // the conversation is over, so the words helper opened for it is closed with it
          closeWords().catch(() => {});
          setStatus("idle");
          setSpeaking(false);
          setThinking(false);
          setMicActive(false);
          setAvatarLive(false);
          heldRef.current = "";
          // a call that has ended sends no handoff: its turn is over
          handoffDueRef.current = false;
          signalRef.current = null;
          socketRef.current = null;
        }
      },
      onUserText: (text) => {
        // the typed line was put on screen as it was sent, so its echo is not a second one
        if (sentRef.current && text.trim() === sentRef.current) {
          sentRef.current = "";
          return;
        }
        pushTurn("user", text);
        // a turn the AI hears for itself is a turn like any other: if it never begins answering,
        // the same turn moves to the next talk AI instead of the call sitting in silence
        const engine = socketRef.current;
        if (engine) armStuck(engine, text);
        reviewHeard(text);
        reviewWanted(text);
      },
      // a cue the provider wrote for its own voice — [curious] — is not a word for a person to
      // read: it is taken out here, once, so neither the screen nor the remembered lines hold it
      onAgentText: (text) => pushTurn("agent", withoutCues(text)),
      // his voice has begun: nothing was stuck, so the wait on the turn is called off
      onAgentAudioStart: () => {
        clearStuck();
        setSpeaking(true);
      },
      onThinking: (on) => setThinking(on),
      onAgentAudioEnd: () => {
        setSpeaking(false);
        flushHeld();
        // the answer has been read out in full: the handoff its second answer asked for is sent
        if (handoffDueRef.current) {
          handoffDueRef.current = false;
          handoffRunRef.current?.();
        }
      },
      onInterrupted: () => {
        setSpeaking(false);
        flushHeld();
      },
      // the app's own ears have written the person's turn down: the words the answer should
      // stand on are asked for, and then the turn itself — with the language it was spoken in
      // — is put to him, so his answer comes back out loud as it always has
      onHeard: async (text, language, engine) => {
        pushTurn("user", text);
        // The ears' own name for the language goes in ahead of the turn, so the answer begins in
        // the right language even when the app's own reading of the turn is still running. The ears
        // do not know Kibembe and write a Kibembe turn down like a Kiswahili one, so their name is
        // handed over as what they wrote — never as a command.
        const earsLang = heardLanguage(language);
        if (earsLang) {
          engine.sendMemory(
            `The ears wrote the person's turn down as ${earsLang}. Read their own words: if they are Kibembe, answer in Kibembe only; if they are ${earsLang}, answer in ${earsLang} only — never in a mix.`
          );
        }
        // The turn itself is put to him now, so neither the words helper nor a lookup can ever leave
        // it unanswered. His own echo of these words is not a second turn on screen.
        sentRef.current = text;
        if (!engine.connected) {
          setNotice("He couldn't be reached — tap the orb and say it again.");
          return;
        }
        if (!engine.sendText(text)) {
          setNotice("That turn didn't reach him — say it again.");
          return;
        }
        // the turn is with the AI on air now: if it never begins answering, the same turn is
        // handed to the next talk AI rather than leaving the person in silence
        armStuck(engine, text);
        // What follows the turn is extra context, never a second turn: the app's own reading of it
        // — the language the person's own words are in, whether it is a greeting, and whether it
        // left a place open — the words the answer should stand on, and the material just looked up.
        const [read, first, material] = await Promise.all([
          readTurn(text),
          wordsNote(text),
          materialFor(text),
        ]);
        // A turn in Kibembe whose words left a place no saved word accounts for is reviewed a second
        // time: the words helper reads its own first answer once more and says which saved Ebembe
        // word fits that place, so the phrase comes out whole.
        const words = first && read.missing ? await wordsNote(text, { first }) : first;
        // the call moved on while the reading ran, so what was found belongs to no turn any more
        if (socketRef.current !== engine || engine.silent || !engine.connected) return;
        // where the app's own knowledge proves the turn is Kibembe, that is said outright
        const spoken = read.lang
          ? `The person just spoke in ${read.lang}. Answer in ${read.lang} only — from your first word to your last, and in no other language.`
          : "";
        const memory = [spoken, read.note, words, material].filter(Boolean).join("\n\n");
        if (!memory) return;
        // He has already begun answering: what was found is held for the turn that follows instead
        // of being pushed over the answer being given
        if (engine.speaking) {
          heldRef.current = `${heldRef.current}\n${memory}`.slice(-HELD_LIMIT);
          return;
        }
        engine.sendMemory(memory);
      },
      onAgentAnswered: () => {
        // an answer has come, so the turn was never stuck
        clearStuck();
        answeredRef.current?.();
        countTalkAnswer();
      },
      // a call answered by the app's own AI says plainly when an answer did not come
      onError: (message) => setError(message),
      // a turn he could make nothing of is asked again in the status line, and the call
      // keeps listening instead of closing
      onReask: (message) => setNotice(message),
      onAutoEnd: ({ reason }) => {
        // a written exchange is already answered on screen, so it ends without a note
        if (quietRef.current) return;
        // a turn he never answered is kept, so the next call opens by answering it
        if (pendingRef.current) {
          setNotice("Tap call again and he'll answer your last question.");
          return;
        }
        setNotice(
          reason === "silence"
            ? "Didn't hear anything — tap the orb to talk again."
            : "Nobody spoke — tap the orb to talk again."
        );
      },
    }),
    [
      pushTurn,
      readTurn,
      reviewHeard,
      reviewWanted,
      flushHeld,
      materialFor,
      countTalkAnswer,
      armStuck,
      clearStuck,
    ]
  );

  // a written question is held back while the knowledge he was handed settles, and
  // the hold is shown as him working
  const holdForKnowledge = useCallback(async (engine) => {
    engine.setAwaiting?.(true);
    await wait(TYPED_HOLD_MS);
  }, []);

  const start = useCallback(
    async ({ withMic = true, firstMessage = "", onAnswered, silent = false } = {}) => {
      const existing = socketRef.current;
      if (onAnswered) answeredRef.current = onAnswered;
      const asked = String(firstMessage || "").trim();
      // a question that was left unanswered is the one he answers as the call opens
      const pending = pendingRef.current;
      const opening = asked || pending;
      const resuming = !asked && !!pending;
      // the line shows the moment it is sent, before the agent's own echo of it; a
      // question carried over is already on screen, so only its echo is filtered out
      if (asked) {
        sentRef.current = asked;
        pushTurn("user", asked);
      } else if (resuming) {
        sentRef.current = opening;
      }
      // A turn that needs something from outside the saved knowledge is looked up before it is put
      // to whoever answers, so the answer never begins while the search for it is still running.
      // The app's own AI looks its own written turns up on the server while it writes the answer,
      // so the phone leaves those to it.
      const wantsLookup = !(voiceMode() === "base44" && !withMic);

      // a call already listening through the microphone carries on — so long as it is the
      // session of the mode in force; a session left over from the other mode is never
      // spoken into, it is ended first so the turn goes to the chosen mode
      if (existing?.connected && (!withMic || existing.micOn) && existing.mode === voiceMode()) {
        if (!firstMessage) return true;
        if (existing.selfLookup) {
          if (silent) await holdForKnowledge(existing);
          existing.sendText(firstMessage);
          return true;
        }
        // while the search runs, the orb shows him working
        existing.setAwaiting?.(true);
        const material = wantsLookup ? await materialFor(firstMessage) : "";
        // the call ended while the search ran: the turn is put to a fresh call below
        if (socketRef.current === existing && existing.connected) {
          if (material) existing.sendMemory?.(material);
          if (silent) await holdForKnowledge(existing);
          if (socketRef.current === existing) existing.sendText(firstMessage);
          return true;
        }
      }
      if (existing?.connected) {
        socketRef.current = null;
        await existing.stop();
      }

      setError("");
      setNotice("");
      setStatus("connecting");
      // this attempt's own number, and the mode it is being made under: a switch taken while
      // the knowledge is still being read orphans the attempt here, so nothing opens under a
      // mode that is no longer the one in force
      const gen = ++sessionRef.current;
      const openingMode = voiceMode();
      const handlers = forSession(makeHandlers(), gen, sessionRef);
      // a session opened after he has spoken is a continuation of the same talk
      const said = linesRef.current;
      const laterTurn = said.length > 0;
      const memory = withStory(buildMemory(said), storyRef.current);
      // a note held back belonged to the session being left behind
      heldRef.current = "";
      // a request for a story, news, a word or a fact is looked up as the session opens, with the
      // knowledge note, so the material is already in hand when he answers it
      const [read, fresh] = await Promise.all([
        // a typed opening is told to the knowledge reader as written, so the language the person
        // wrote in is read from their own words and named at the head of the note
        loadKnowledgeNote(opening, !withMic),
        wantsLookup && opening ? materialFor(opening) : Promise.resolve(""),
      ]);
      // a question put to the original outside voice in writing is asked of the words helper as
      // well, so the words its answer should stand on are in hand before it answers
      const wordNote = openingMode === "agent" ? await wordsNote(opening) : "";
      // a typed turn in Kibembe whose words left a place no saved word accounts for is reviewed a
      // second time, so the word that fits that place is found before the question is put to him
      const reviewed =
        wordNote && read.missing ? await wordsNote(opening, { first: wordNote }) : wordNote;
      // both kinds of call are handed the admin's knowledge: the words the question
      // turns on, the guidance that goes with them, and anything just looked up
      const knowledge = withKnowledge(
        memory,
        withKnowledge(read.note, withKnowledge(fresh, reviewed))
      );

      // the mode changed while the knowledge was being read: this call is not the one the
      // admin asked for, so it is left unopened and nothing of it reaches the room — and a
      // microphone the tap opened is closed with it rather than left listening
      if (gen !== sessionRef.current || voiceMode() !== openingMode) {
        dropMic();
        return false;
      }

      // The admin's own switch decides who answers, and each mode with an account of its own
      // answers on that account and nowhere else: Base44 mode's spoken voice on the admin's
      // second, separate account — its own key and its own agent, so Base44 is left to text and
      // chat alone — and Mbondo on his own third account, and Sadiki on his own fourth, each for
      // everything they are asked, written or spoken. Every other call keeps the original outside
      // voice's standing account.
      // A spoken call on the original outside voice answers on the talk AI whose turn it is: the
      // four take turns, so the one the last handoff left ready is the one this call opens on.
      // A typed question put to the original outside voice is answered in writing by the writer
      // — the helper account kept for exactly that — so he stays the voice of the conversation
      // and never has to write. Every other mode keeps answering in both ways as it always has.
      const writer = !withMic && openingMode === "agent";
      // ...and with the microphone open he speaks only, whoever answers: the app's own ears hear
      // the person, and the words they come back with — with the material looked up for them —
      // are what he answers. That is what keeps the turn the phone's to hand over, so no provider
      // answers a question before the search for it has finished
      const ears = withMic;
      const account = writer
        ? "helper-write"
        : openingMode === "agent" && withMic
          ? talkRef.current.account
          : openingMode === "base44" && withMic
            ? "second"
            : openingMode === "mbondo"
              ? "third"
              : openingMode === "sadiki"
                ? "fourth"
                : "";
      const ownVoice = account !== "";
      if (openingMode === "base44" && !ownVoice) {
        const call = new Base44Call(handlers);
        // the mode this session answers under, so a later switch knows to end it
        call.mode = openingMode;
        // the app's own AI looks its own turn up on the server while it writes the answer, so
        // the phone does not fetch the same material twice
        call.selfLookup = true;
        socketRef.current = call;
        quietRef.current = silent;
        setMicActive(withMic);
        try {
          await call.open({ withMic, silent, memory: knowledge });
          if (opening) call.sendText(opening, { speak: withMic });
          return true;
        } catch (err) {
          setError(
            err?.response?.data?.error || err?.message || "Could not start the conversation."
          );
          setStatus("idle");
          setMicActive(false);
          socketRef.current = null;
          await call.stop();
          return false;
        }
      }

      // when the owner's face is in place the call runs through it, with the same
      // ElevenLabs agent answering behind it. Typing is answered in writing, so it
      // never opens the face or the speaker — and neither does a call answered on an account of
      // its own: the face belongs to the original outside voice, so every call answered on
      // another account runs without it, and so does one whose ears are the app's own
      if (!silent && !ownVoice && !ears && faceReadyRef.current && videoRef?.current) {
        const call = new AvatarCall(handlers);
        call.mode = openingMode;
        socketRef.current = call;
        quietRef.current = false;
        setMicActive(withMic);
        try {
          await call.open({
            withMic,
            videoEl: videoRef.current,
            memory: knowledge,
            laterTurn,
            resuming,
          });
          setAvatarLive(true);
          if (opening) call.sendText(opening);
          return true;
        } catch (err) {
          // Keep voice available, but explain why the face could not start.
          await call.stop();
          socketRef.current = null;
          setAvatarLive(false);
          setNotice(`${err?.response?.data?.error || err?.message || "Live avatar unavailable."} Continuing with voice only.`);
        }
      }

      const socket = new VoiceSocket(handlers);
      socket.mode = openingMode;
      socketRef.current = socket;
      quietRef.current = silent;
      setMicActive(withMic);

      try {
        await socket.open({
          withMic,
          silent,
          ears,
          memory: knowledge,
          laterTurn,
          resuming,
          // the account this mode answers on: the second for Base44's spoken call, the third
          // for Mbondo, the fourth for Sadiki, and the standing one otherwise
          account,
        });
        if (opening) {
          // a typed question goes in once the note has settled, not the moment the
          // session opens; a question carried over from the last call is answered
          // straight away, since the note was handed over as the session opened
          if (!resuming) await holdForKnowledge(socket);
          if (socketRef.current === socket) socket.sendText(opening);
        }
        return true;
      } catch (err) {
        setError(
          err?.response?.data?.error || err?.message || "Could not start the conversation."
        );
        setStatus("idle");
        setMicActive(false);
        socketRef.current = null;
        await socket.stop();
        // a microphone the tap opened but this call never took is closed with it
        dropMic();
        return false;
      }
    },
    [holdForKnowledge, makeHandlers, pushTurn, videoRef, materialFor]
  );

  const stop = useCallback(async () => {
    // the session being ended is orphaned, so a reply already on its way is dropped rather
    // than put on screen and charged for after the person has stopped the call
    sessionRef.current += 1;
    const socket = socketRef.current;
    socketRef.current = null;
    // the call being ended is not waited on any more, and the turn it was holding is left for
    // whoever takes it next
    clearStuck();
    // a call the person ends themselves asks for no handoff
    handoffDueRef.current = false;
    signalRef.current = null;
    setSpeaking(false);
    setThinking(false);
    setMicActive(false);
    setAvatarLive(false);
    setStatus("idle");
    if (socket) await socket.stop();
    await closeWords().catch(() => {});
  }, []);

  /**
   * The handoff, once a talk AI has given its two answers: the fifth AI is asked whose turn is
   * next, its signal is read on the server against the four accounts the app is set up with, the
   * call that has had its turn is hung up, and the AI the signal named opens straight away to take
   * the person's next one — the change of AI is never something the person starts themselves. The
   * talk so far stays on screen and goes with the new call, so nothing of it is lost in the change.
   * A signal that cannot be used is never guessed at: the server hands the turn to the AI that
   * follows in order, and only where no other AI is set up at all does the same AI carry on.
   */
  const runHandoff = useCallback(async () => {
    const engine = socketRef.current;
    if (!engine || quietRef.current) return;
    const from = { ...talkRef.current };

    // the signal was asked for while the second answer was still being given, so it is usually
    // already in hand; one that is not in hand is asked for now
    const asked = signalRef.current;
    signalRef.current = null;
    const next = await (asked || requestHandoff(from));

    // the call was ended, or the mode switched, while the signal was on its way: it belongs to no
    // call any more, and moves nothing
    if (socketRef.current !== engine) return;

    if (!next) {
      talkRef.current = { ...from, answered: 0 };
      setNotice(noSignalNotice(from.label));
      return;
    }

    // the AI the signal named takes the next two questions: the call that has had its turn is hung
    // up and the new one opens straight away, listening for the person's next turn with the talk so
    // far in hand — the person never has to start the next AI themselves
    talkRef.current = { id: next.id, label: next.label, account: next.account, answered: 0 };
    setTalkLabel(next.label);
    await stop();
    setNotice(handoffNotice(from.label, next.label));
    await start({ withMic: true, onAnswered: answeredRef.current });
  }, [requestHandoff, start, stop]);

  // an answer's own end is what sends a handoff, so the runner is reachable from there
  useEffect(() => {
    handoffRunRef.current = runHandoff;
  }, [runHandoff]);

  /**
   * The talk AI that follows the one stuck on a turn, read on the server against the accounts the
   * app is set up with, so a turn is never handed to an account that is not whole. No signal is
   * asked for here — an AI that has stalled must not be waited on again — the order is the answer.
   */
  const nextTalk = useCallback(async (fromId) => {
    try {
      const res = await base44.functions.invoke("callHandoff", { reply: "", from: fromId });
      return res?.data?.next || null;
    } catch (err) {
      return null;
    }
  }, []);

  /**
   * The AI on air never began answering, so the turn it was holding goes to the AI that follows it:
   * the stalled call is hung up — the answer it never gave can neither reach the screen nor be
   * charged for — and the AI taking over opens straight away on the turn that is still waiting, so
   * the person only has to wait, never to ask again.
   */
  const runStuck = useCallback(
    async (engine, said) => {
      const from = { ...talkRef.current };
      const next = await nextTalk(from.id);
      // the call was ended, or the mode switched, while the next AI was being looked up
      if (socketRef.current !== engine) return;
      if (!next) {
        setNotice("He didn't answer just now — say that again.");
        return;
      }

      talkRef.current = { id: next.id, label: next.label, account: next.account, answered: 0 };
      setTalkLabel(next.label);
      signalRef.current = null;
      handoffDueRef.current = false;
      await stop();
      // the turn nobody answered is kept, so the AI taking over is the one that answers it
      pendingRef.current = said;
      await start({ withMic: true, onAnswered: answeredRef.current });
      setNotice(stuckNotice(from.label, next.label));
    },
    [nextTalk, start, stop]
  );

  // a stall is reported by a timer, so the move is reachable from there
  useEffect(() => {
    stuckRunRef.current = runStuck;
  }, [runStuck]);

  const sendText = useCallback(
    (text) => {
      sentRef.current = text.trim();
      pushTurn("user", text);
      return socketRef.current?.sendText(text);
    },
    [pushTurn]
  );

  useEffect(() => {
    if (status !== "live") {
      levelRef.current = 0;
      return undefined;
    }
    const tick = () => {
      levelRef.current = socketRef.current?.level?.() || 0;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [status]);

  useEffect(
    () => () => {
      if (socketRef.current) socketRef.current.stop();
    },
    []
  );

  return {
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
    connected: status === "live",
    start,
    stop,
    sendText,
  };
}