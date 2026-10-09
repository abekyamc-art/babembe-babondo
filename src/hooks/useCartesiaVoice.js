import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { primedAudio, primeAudio, resumeAudioOnTouch } from "@/lib/audioUnlock";
import { claimMic, micMessage, primeMic } from "@/lib/micAccess";
import { cartesiaFailed, cartesiaOpened, cartesiaOrder } from "@/lib/cartesiaBackup";
import CartesiaCall from "@/lib/cartesiaCall";
import { readHeardTurn } from "@/lib/homeHearing";
import { loadTurnPictures } from "@/lib/knowledge";
import { SAY_AGAIN_KIBEMBE, SAY_AGAIN_TURN, isMisheard, isRealTurn } from "@/lib/misheardSpeech";
import { CARTESIA_AI } from "@/lib/providerNames";
import { noteVoiceTurn } from "@/lib/kpiEvents";

/**
 * The Cartesia voice on the line: the outside agent the home page's calls hand over to. It listens
 * and answers by itself, so there is nothing to ask on the app's behalf — the turns it reports are
 * the turns shown on screen, and each finished answer is handed to whoever is counting them.
 *
 * Three Cartesia accounts answer through it: Cartesia AI on the app's own account, Cartesia AI 1 on
 * the admin's second one and Cartesia AI 2 on their third, each with its own key and its own agent.
 * Whoever is on the call is the one its call is opened on, and the one named in anything the screen
 * says about it.
 */

const NO_REACH = (who) => `${who} couldn't be reached. Please try again.`;
const ENDED = (who) => `${who}'s call ended. Tap the phone to talk again.`;
const TOUCH_TO_HEAR = "Touch the screen to let the sound through.";

export default function useCartesiaVoice({
  onTurn,
  onPictures,
  onAnswered,
  onAnswerEnd,
  onEnded,
} = {}) {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const levelRef = useRef(0);
  // the Cartesia voice the call is open on, named on screen and in anything said about it
  const labelRef = useRef(CARTESIA_AI);
  // and the account behind that voice, one of the three the Cartesia seat is made of
  const liveAccountRef = useRef("");

  const callRef = useRef(null);
  const activeRef = useRef(false);
  // a call is opening right now: a tap that lands on it never opens a second one
  const startingRef = useRef(false);
  const speakingRef = useRef(false);
  // the turn and the answer are always reported through the handlers as they stand right now
  const turnRef = useRef(onTurn);
  turnRef.current = onTurn;
  const answeredRef = useRef(onAnswered);
  answeredRef.current = onAnswered;
  // the end of an answer is reported the same way, so a call can move on the moment it is read out
  const answerEndRef = useRef(onAnswerEnd);
  answerEndRef.current = onAnswerEnd;
  // a call the service closed by itself is reported the same way, so the turn it leaves behind is
  // never lost
  const endedRef = useRef(onEnded);
  endedRef.current = onEnded;
  // the line he said last, so a correction on the next turn is read against it
  const lastAgentRef = useRef("");
  // the person's own last turn, so his answer is read against the admin's own pictures
  const lastUserRef = useRef("");
  // the pictures of an answer are handed over through here the moment they are found
  const picturesRef = useRef(onPictures);
  picturesRef.current = onPictures;
  // while the phone is holding the sound back, this waits for the touch that starts it
  const offTouchRef = useRef(null);

  const backToListening = useCallback(() => {
    if (!activeRef.current) return;
    setStatus(speakingRef.current ? "speaking" : "listening");
  }, []);

  /** The call is gone: the screen goes back to its own rest. */
  const finish = useCallback(() => {
    activeRef.current = false;
    speakingRef.current = false;
    callRef.current = null;
    levelRef.current = 0;
    if (offTouchRef.current) {
      offTouchRef.current();
      offTouchRef.current = null;
    }
    setActive(false);
    setStatus("idle");
  }, []);

  /** The session the service closed itself, with the call already picked up. */
  const handleStatus = useCallback(
    (next) => {
      if (next !== "closed") return;
      if (!activeRef.current) return;
      finish();
      setNotice(ENDED(labelRef.current));
      // the call closed on its own: whoever is counting the turns decides whether the same AI waits
      // behind the next tap or the ring moves on
      endedRef.current?.();
    },
    [finish]
  );

  /** The person's own turn, written down and reported by the agent. */
  const handleUserText = useCallback(
    (text) => {
      const said = String(text || "").trim();
      if (!said) return;
      // What the app's own ears write for a breath of the room is a fragment, never a turn of the
      // person's: no line nobody said is ever stood in the talk as theirs, and they are asked to say
      // it again instead.
      if (!isRealTurn(said)) {
        setNotice(SAY_AGAIN_TURN);
        return;
      }
      // Sometimes the ears write a language nobody on this call speaks — a guess at some other
      // script altogether. Those are not the person's words and nothing is read from them: the turn
      // is asked for once more, and the Kibembe they really said is what comes back.
      if (isMisheard(said)) {
        setNotice(SAY_AGAIN_KIBEMBE);
        return;
      }
      setNotice("");
      lastUserRef.current = said;
      turnRef.current?.("user", said);
      // Cartesia AI hears, answers and speaks on its own account, and its own settings are left
      // exactly as they are — so no reading is handed to it. What the reading is still used for is
      // the app's own learning: a word, a sound or an answer the person puts right on this turn is
      // saved into the Word Bank, so the Kibembe they confirm is not lost with the call.
      readHeardTurn(said, lastAgentRef.current);
    },
    []
  );

  /**
   * The person puts the app's own writing of their turn right. Cartesia AI hears the person itself,
   * writes its own turn down and answers on its own account, and nothing of the app's is pushed into
   * its call — so what the correction is kept for here is the app's own record of the talk and the
   * app's own Word Bank, which the words they put right are read against exactly as any other turn
   * of theirs is.
   */
  const correct = useCallback((text) => {
    const said = String(text || "").trim();
    if (!said) return false;
    readHeardTurn(said, lastAgentRef.current);
    setNotice("Your words are saved — Cartesia AI answers from what it heard.");
    return true;
  }, []);

  /** His turn, as the agent itself wrote it down. */
  const handleAgentText = useCallback((text) => {
    const line = String(text || "").trim();
    if (line) lastAgentRef.current = line;
    turnRef.current?.("assistant", text);
    // The words this answer is made of are read against the admin's pictures as the answer is shown,
    // and the pictures of the words it carries join it a moment later: the answer is never held back
    // while they are found, and most answers carry none.
    const asked = lastUserRef.current;
    if (!asked) return;
    loadTurnPictures(asked, line).then((pictures) => {
      if (pictures.length) picturesRef.current?.(text, pictures);
    });
  }, []);

  /** An answer is complete and read out: it is counted against the turn this AI is on. */
  const handleAnswered = useCallback(() => answeredRef.current?.(), []);

  const handleThinking = useCallback(
    (on) => {
      if (!activeRef.current) return;
      if (on) {
        if (!speakingRef.current) setStatus("thinking");
        return;
      }
      backToListening();
    },
    [backToListening]
  );

  /** His voice has begun: the working line gives way to the sound of it. */
  const handleAudioStart = useCallback(() => {
    if (!activeRef.current) return;
    speakingRef.current = true;
    setStatus("speaking");
  }, []);

  /** His voice has drained — or the person spoke over it: the call listens again. */
  const handleAudioEnd = useCallback(() => {
    speakingRef.current = false;
    backToListening();
    // his voice has drained: one voice turn has been spoken out in full
    noteVoiceTurn();
    // the answer has been read out in full: a change it asked for is sent here and now
    answerEndRef.current?.();
  }, [backToListening]);

  const handleError = useCallback((message) => setError(message), []);

  /**
   * A turn the app's own ears could not read. Nothing else writes it down — the app has one reader
   * — so the person is simply asked for the turn again, and the words their answer is given from
   * are always the app's own reading of what they said.
   */
  const handleReask = useCallback((message) => {
    if (!activeRef.current) return;
    setNotice(String(message || ""));
  }, []);

  /**
   * The call opens here, on the first of the seat's three accounts that can take it. The keys
   * themselves never reach the phone: the app's own server is asked for a short-lived token for one
   * account, and that is what opens the agent's calling socket. What comes back is whether the call
   * opened, the reason it could not, and which account really answered, so whoever asked for it can
   * say so plainly and name the voice that is on the line.
   */
  const start = useCallback(
    async ({ label = CARTESIA_AI } = {}) => {
      // a call is opening or already open: a tap that lands on it never opens a second one
      if (activeRef.current || startingRef.current) {
        return { ok: true, why: "", account: liveAccountRef.current, label: labelRef.current };
      }
      startingRef.current = true;

      setError("");
      setNotice("");
      setStatus("connecting");

      // the sound the tap started is the one this call plays through, whichever account answers, and
      // a call never closes it — so the voice standing down can never take the sound away from the
      // voice that follows it
      const audio = primeAudio();

      const handlers = {
        onStatus: handleStatus,
        onUserText: handleUserText,
        onAgentText: handleAgentText,
        onThinking: handleThinking,
        onAgentAudioStart: handleAudioStart,
        onAgentAudioEnd: handleAudioEnd,
        onAnswered: handleAnswered,
        onError: handleError,
        onReask: handleReask,
      };

      // The accounts behind this one seat are tried in their own order — the app's own account first,
      // then the admin's second and third — so the call opens on whichever of them the app has
      // available. An account that could not take it stands aside for a while, and a real call on it
      // clears that at once, so a recovered account takes its place back on a later call by itself.
      let why = "";
      let refused = label || CARTESIA_AI;
      for (const one of cartesiaOrder()) {
        refused = one.label;
        labelRef.current = one.label;

        // the microphone is asked for inside the tap that began the call, and every account is given
        // its own: an account that could not take the call releases the one it was handed before the
        // next one is tried, so no two accounts are ever listening at once
        primeMic();
        let stream;
        try {
          stream = await claimMic();
        } catch (err) {
          startingRef.current = false;
          setStatus("idle");
          return { ok: false, why: micMessage(err), account: "", label: one.label };
        }

        let session;
        try {
          const res = await base44.functions.invoke("cartesiaSession", { account: one.account });
          session = res?.data || {};
        } catch (err) {
          session = {};
        }
        if (!session.token || !session.agent_id) {
          stream.getTracks().forEach((track) => track.stop());
          cartesiaFailed(one.account);
          why = session.error || NO_REACH(one.label);
          continue;
        }

        const call = new CartesiaCall(handlers);
        try {
          await call.open({ stream, token: session.token, agentId: session.agent_id, audio });
        } catch (err) {
          await call.stop();
          stream.getTracks().forEach((track) => track.stop());
          cartesiaFailed(one.account);
          why = err?.message || NO_REACH(one.label);
          continue;
        }

        callRef.current = call;
        liveAccountRef.current = one.account;
        activeRef.current = true;
        startingRef.current = false;
        // a real call opened on it: it is healthy again, whatever it did before
        cartesiaOpened(one.account);
        setActive(true);
        setStatus("listening");

        // the phone's hold on the sound: nothing above is heard until it is started, and a touch is
        // what starts it
        if (primedAudio()?.state !== "running") {
          setNotice(TOUCH_TO_HEAR);
          offTouchRef.current = resumeAudioOnTouch(() => setNotice(""));
        }
        return { ok: true, why: "", account: one.account, label: one.label };
      }

      // None of the accounts could take the call — a key refused, an agent not set up, a service
      // having a bad moment. The microphone is closed and the seat is passed over, so the ring moves
      // on to the app's other voices instead of a call nobody can hear being shown as live.
      startingRef.current = false;
      setStatus("idle");
      labelRef.current = refused;
      return { ok: false, why: why || NO_REACH(refused), account: "", label: refused };
    },
    [
      handleAnswered,
      handleAgentText,
      handleAudioEnd,
      handleAudioStart,
      handleError,
      handleReask,
      handleStatus,
      handleThinking,
      handleUserText,
    ]
  );

  const stop = useCallback(async () => {
    const call = callRef.current;
    finish();
    if (call) await call.stop();
  }, [finish]);

  // the microphone and the connection are never left open once the screen is gone
  useEffect(
    () => () => {
      callRef.current?.stop();
    },
    []
  );

  return {
    status,
    speaking: status === "speaking",
    thinking: status === "thinking",
    micActive: active,
    error,
    notice,
    levelRef,
    start,
    stop,
    // the person's own words put in place of the writing of their turn
    correct,
  };
}