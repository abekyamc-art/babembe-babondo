import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import LiveLink from "@/lib/liveLink";
import {
  beat,
  clearMySignals,
  clearSignalsWith,
  dropSignal,
  joinRoom,
  leaveRoom,
  pendingSignals,
  roomPeers,
  sendSignal,
} from "@/lib/livePeers";

const BEAT_MS = 15000;
const ROSTER_MS = 12000;
const EVENT_GAP_MS = 4000;

/**
 * Everything a phone contributes to a live room: who is in it, the camera and
 * microphone the host or a guest sends, and one direct link per other phone.
 * A phone with something to send offers to everybody else; a phone that only
 * watches waits for those offers and answers them.
 */
export default function useLiveRoom({ roomId, me, username, avatarUrl, role, live }) {
  const email = me?.email || "";
  const [peers, setPeers] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [linkStates, setLinkStates] = useState({});
  const [mediaError, setMediaError] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [facing, setFacing] = useState("user");

  const rowRef = useRef(null);
  const roleRef = useRef(role);
  const cameraOnRef = useRef(true);
  const facingRef = useRef("user");
  const localRef = useRef(null);
  const outRef = useRef(new Map());
  const inRef = useRef(new Map());
  const offeredRef = useRef(new Set());

  const noteState = useCallback((peerEmail, state) => {
    setLinkStates((prev) => (prev[peerEmail] === state ? prev : { ...prev, [peerEmail]: state }));
  }, []);

  const closeEverything = useCallback(() => {
    outRef.current.forEach((link) => link.close());
    inRef.current.forEach((link) => link.close());
    outRef.current.clear();
    inRef.current.clear();
    offeredRef.current.clear();
    setRemoteStreams({});
  }, []);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  // 1. my seat in the room, kept warm so everyone can see I'm still here
  useEffect(() => {
    if (!roomId || !email || !live) return undefined;
    let alive = true;
    joinRoom({ roomId, user: me, username, avatarUrl, role: roleRef.current }).then((row) => {
      if (!alive) {
        if (row?.id) leaveRoom(row.id);
        return;
      }
      rowRef.current = row?.id || null;
      if (row && row.role !== roleRef.current) {
        beat(row.id, roleRef.current, cameraOnRef.current);
      }
    });
    const timer = setInterval(() => {
      if (rowRef.current) beat(rowRef.current, roleRef.current, cameraOnRef.current);
    }, BEAT_MS);
    return () => {
      alive = false;
      clearInterval(timer);
      const kept = rowRef.current;
      rowRef.current = null;
      leaveRoom(kept);
    };
  }, [roomId, email, live, me, username, avatarUrl]);

  // a guest who is let go sits back down as a viewer
  useEffect(() => {
    if (rowRef.current) beat(rowRef.current, role, cameraOnRef.current);
  }, [role]);

  // 2. who is in the room right now
  useEffect(() => {
    if (!roomId || !email || !live) {
      setPeers([]);
      return undefined;
    }
    let alive = true;
    let lastLoad = 0;
    const load = async () => {
      lastLoad = Date.now();
      try {
        const rows = await roomPeers(roomId);
        if (alive) setPeers(rows);
      } catch (err) {
        // the room closed while we were reading it
      }
    };
    load();
    const timer = setInterval(load, ROSTER_MS);
    const unsubscribe = base44.entities.LivePeer.subscribe((event) => {
      const row = event?.data;
      if (!row || row.room_id !== roomId) return;
      if (Date.now() - lastLoad < EVENT_GAP_MS) return;
      load();
    });
    return () => {
      alive = false;
      clearInterval(timer);
      unsubscribe();
    };
  }, [roomId, email, live]);

  // 3. the camera and microphone, only while this phone is meant to be on
  useEffect(() => {
    if (!live || (role !== "host" && role !== "guest")) return undefined;
    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaError("This device can't open a camera or microphone here.");
      return undefined;
    }
    let alive = true;
    let stream = null;
    const wanted =
      role === "host"
        ? {
            video: {
              facingMode: facingRef.current,
              width: { ideal: 720 },
              height: { ideal: 1280 },
            },
            audio: true,
          }
        : { audio: true };
    navigator.mediaDevices
      .getUserMedia(wanted)
      .then((got) => {
        if (!alive) {
          got.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = got;
        localRef.current = got;
        cameraOnRef.current = true;
        setCameraOn(true);
        setMicOn(true);
        setMediaError("");
        setLocalStream(got);
      })
      .catch(() => {
        if (!alive) return;
        setMediaError(
          role === "host"
            ? "Your camera and microphone are blocked — allow them to be seen and heard."
            : "Your microphone is blocked, so the room can't hear you yet."
        );
      });
    return () => {
      alive = false;
      localRef.current = null;
      setLocalStream(null);
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [live, role]);

  // 4. one direct link per other phone
  useEffect(() => {
    if (!live || !email) {
      closeEverything();
      return;
    }
    const others = peers.filter((peer) => peer.user_email !== email);
    const present = new Set(others.map((peer) => peer.user_email));
    const tracks = localRef.current ? localRef.current.getTracks() : [];

    if (!tracks.length) {
      outRef.current.forEach((link) => link.close());
      outRef.current.clear();
      offeredRef.current.clear();
    } else {
      others.forEach((peer) => {
        if (offeredRef.current.has(peer.user_email)) return;
        offeredRef.current.add(peer.user_email);
        const link = new LiveLink({
          tracks,
          onState: (state) => noteState(peer.user_email, state),
        });
        outRef.current.set(peer.user_email, link);
        link
          .offer()
          .then((payload) =>
            sendSignal({
              roomId,
              from: email,
              to: peer.user_email,
              kind: "offer",
              payload,
            })
          )
          .catch(() => {
            link.close();
            outRef.current.delete(peer.user_email);
            offeredRef.current.delete(peer.user_email);
          });
      });
    }

    // whoever has gone takes their links with them
    outRef.current.forEach((link, peerEmail) => {
      if (present.has(peerEmail)) return;
      link.close();
      outRef.current.delete(peerEmail);
      offeredRef.current.delete(peerEmail);
      clearSignalsWith(roomId, peerEmail);
      setRemoteStreams((prev) => {
        const next = { ...prev };
        delete next[peerEmail];
        return next;
      });
    });
    inRef.current.forEach((link, peerEmail) => {
      if (present.has(peerEmail)) return;
      link.close();
      inRef.current.delete(peerEmail);
    });
  }, [peers, localStream, live, email, roomId, closeEverything, noteState]);

  // 5. take in the other phones' offers and answers
  useEffect(() => {
    if (!live || !email) return undefined;
    let alive = true;

    const takeOffer = async (signal) => {
      const from = signal.from_email;
      if (inRef.current.has(from)) {
        dropSignal(signal.id);
        return;
      }
      const link = new LiveLink({
        onStream: (stream) =>
          setRemoteStreams((prev) => (prev[from] === stream ? prev : { ...prev, [from]: stream })),
        onState: (state) => noteState(from, state),
      });
      inRef.current.set(from, link);
      try {
        const answer = await link.answer(JSON.parse(signal.payload));
        await sendSignal({ roomId, from: email, to: from, kind: "answer", payload: answer });
      } catch (err) {
        link.close();
        inRef.current.delete(from);
      } finally {
        dropSignal(signal.id);
      }
    };

    const takeAnswer = async (signal) => {
      const link = outRef.current.get(signal.from_email);
      dropSignal(signal.id);
      if (!link) return;
      try {
        await link.accept(JSON.parse(signal.payload));
      } catch (err) {
        // the other phone moved on before we answered
      }
    };

    const handle = (signal) => {
      if (!alive || !signal || signal.room_id !== roomId || signal.to_email !== email) return;
      if (signal.kind === "offer") takeOffer(signal);
      if (signal.kind === "answer") takeAnswer(signal);
    };

    pendingSignals(roomId, email).then((rows) => rows.forEach(handle));
    const unsubscribe = base44.entities.LiveSignal.subscribe(handle);
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [live, email, roomId, noteState]);

  // 6. leaving the screen ends every link and clears my connection notes
  useEffect(
    () => () => {
      closeEverything();
      if (roomId && email) clearMySignals(roomId, email);
    },
    [roomId, email, closeEverything]
  );

  /** Silencing the microphone keeps the link open, it just goes quiet. */
  const toggleMic = useCallback(() => {
    setMicOn((prev) => {
      const next = !prev;
      localRef.current?.getAudioTracks().forEach((track) => {
        track.enabled = next;
      });
      return next;
    });
  }, []);

  const toggleCamera = useCallback(() => {
    const next = !cameraOnRef.current;
    cameraOnRef.current = next;
    setCameraOn(next);
    localRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    if (rowRef.current) beat(rowRef.current, roleRef.current, next);
  }, []);

  // the front and back cameras swap inside the links that are already open
  const flipCamera = useCallback(async () => {
    if (!localRef.current || !navigator.mediaDevices?.getUserMedia) return;
    const next = facingRef.current === "user" ? "environment" : "user";
    try {
      const fresh = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: next, width: { ideal: 720 }, height: { ideal: 1280 } },
        audio: false,
      });
      const track = fresh.getVideoTracks()[0];
      if (!track) return;
      outRef.current.forEach((link) => link.replaceVideo(track));
      const current = localRef.current;
      const audio = current.getAudioTracks();
      current.getVideoTracks().forEach((item) => item.stop());
      const rebuilt = new MediaStream([track, ...audio]);
      localRef.current = rebuilt;
      facingRef.current = next;
      setFacing(next);
      setLocalStream(rebuilt);
    } catch (err) {
      // this phone only has the one camera
    }
  }, []);

  const problem = useMemo(() => {
    const stuck = Object.values(linkStates).some(
      (state) => state === "failed" || state === "disconnected"
    );
    return stuck ? "Can't reach one phone in this room directly — it may reconnect on its own." : "";
  }, [linkStates]);

  return {
    peers,
    localStream,
    remoteStreams,
    mediaError,
    micOn,
    cameraOn,
    facing,
    toggleMic,
    toggleCamera,
    flipCamera,
    problem,
    guests: peers.filter((peer) => peer.role === "guest" && peer.user_email !== email),
  };
}