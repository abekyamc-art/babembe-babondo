import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { RAP_COST, balanceOf, creditCoins, spendCoins } from "@/lib/coins";
import { DEFAULT_LANGUAGE } from "@/lib/rapLanguage";
import { freshSteps } from "@/lib/rapSteps";
import { ensureProfile } from "@/lib/social";
import {
  APP_BEAT_KEY,
  DEFAULT_BPM,
  DEFAULT_FLOW,
  DEFAULT_TAKE,
  barsFor,
  beatSeconds,
  styleLabel,
} from "@/lib/rapBeat";
import { decodeBytes, hasBeat, keyBytes, readSong, renderBeat, stripVoice, tempoOf } from "@/lib/beatExtract";
import { fetchAudio, mixTake, wavBlob } from "@/lib/rapAudio";
import { saveBlob, saveRemote, slug, takeText, videoName } from "@/lib/rapLines";
import { recordTake } from "@/lib/rapVideo";

/** Everything the Rap Studio does: the lines, the take, its files and the takes kept. */
export default function useRapStudio() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [words, setWords] = useState(null);
  const [wordsUsed, setWordsUsed] = useState([]);
  const [settings, setSettings] = useState({
    voice: "sing",
    language: DEFAULT_LANGUAGE,
    flow: DEFAULT_FLOW,
    beat: "app",
    bpm: DEFAULT_BPM,
    seconds: DEFAULT_TAKE,
    topic: "",
  });
  const [lines, setLines] = useState([]);
  const [take, setTake] = useState(null);
  const [takes, setTakes] = useState([]);
  const [beat, setBeat] = useState(null);
  const [song, setSong] = useState(null);
  const [savedBeats, setSavedBeats] = useState([]);
  const [beatStyle, setBeatStyle] = useState("afro");
  const [beatNote, setBeatNote] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [shortOnCoins, setShortOnCoins] = useState(false);
  // one run's own steps, and the clock they are read against
  const [steps, setSteps] = useState([]);
  const [runStartedAt, setRunStartedAt] = useState(0);
  const [runEndedAt, setRunEndedAt] = useState(0);

  /** What one step of the run is doing right now. */
  const markStep = useCallback((id, state) => {
    setSteps((prev) => prev.map((step) => (step.id === id ? { ...step, state } : step)));
  }, []);

  /** A run begins: every step is laid out, none of them done yet. */
  const startSteps = useCallback(() => {
    setSteps(freshSteps());
    setRunStartedAt(Date.now());
    setRunEndedAt(0);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await base44.auth.me();
        if (!alive) return;
        setUser(me);
        setProfile(await ensureProfile(me));
      } catch (err) {
        // the studio stays on its signed-out state
      }
      try {
        const res = await base44.functions.invoke("rapLyrics", {});
        if (!alive) return;
        setWords(res?.data?.words || []);
        if (res?.data?.error) setError(res.data.error);
      } catch (err) {
        if (alive) setWords([]);
      }
      try {
        const page = await base44.entities.RapTake.filter({}, { sort: "-created_date", limit: 20 });
        if (alive) setTakes(page?.items || []);
      } catch (err) {
        // the history stays empty
      }
      try {
        const kept = await base44.entities.SavedBeat.filter({}, { sort: "-created_date", limit: 20 });
        if (alive) setSavedBeats(kept?.items || []);
      } catch (err) {
        // the saved beats row stays empty
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const titleOf = useCallback(
    (currentLines, topic) =>
      topic?.trim() ||
      currentLines[0]?.ebembe?.slice(0, 40) ||
      "Ebembe Rap",
    []
  );

  /** A take of its own beat: kept privately, and mixed on the phone under the voice. */
  const setBeatFile = useCallback(async (file) => {
    setError("");
    try {
      const bytes = await file.arrayBuffer();
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      setBeat({ name: file.name, bytes, file_uri });
      setSettings((prev) => ({ ...prev, beat: "mine" }));
    } catch (err) {
      setError("Beat yako haikuweza kupakiwa. Jaribu tena.");
    }
  }, []);

  /** A song the person sends: read on the phone, its speed measured, its voice ready to lift. */
  const sendSong = useCallback(async (file) => {
    setError("");
    setBeatNote("");
    setBusy("read");
    try {
      const read = await readSong(file);
      const found = tempoOf(read.buffer);
      // the song is kept privately so the cloud separation can read it back; without it the
      // beat is still lifted on the phone
      let file_uri = "";
      try {
        const kept = await base44.integrations.Core.UploadPrivateFile({ file });
        file_uri = kept?.file_uri || "";
      } catch (err) {
        file_uri = "";
      }
      setSong({
        name: file.name,
        buffer: read.buffer,
        bpm: found.bpm,
        confident: found.confident,
        file_uri,
      });
      setBeatNote(
        found.confident
          ? `Wimbo wako umepimwa: mwendo wa ${found.bpm} BPM.`
          : "Sikuweza kupima mwendo wa wimbo huu — natumia BPM ya studio."
      );
      if (found.confident) setSettings((prev) => ({ ...prev, bpm: found.bpm }));
    } catch (err) {
      setError(err?.message || "Wimbo haukuweza kusomwa. Jaribu faili jingine.");
    }
    setBusy("");
  }, []);

  /** The voice taken out of the middle of the mix on the phone: the fallback for when the
   *  cloud separation cannot run at all. */
  const phoneBeatOnly = useCallback(async () => {
    const out = stripVoice(song.buffer);
    if (!out.ok) return false;

    const blob = wavBlob(out.buffer);
    const bytes = await blob.arrayBuffer();
    const bpm = song.confident ? song.bpm : settings.bpm;
    const file = new File([blob], `${slug(song.name)}-beat.wav`, { type: "audio/wav" });
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });

    setBeat({ name: `Beat pekee · ${bpm} BPM`, bytes, file_uri, bpm, source: "song" });
    setSettings((prev) => ({ ...prev, beat: "mine", bpm }));
    return true;
  }, [settings.bpm, song]);

  /** The beat alone out of a song: the song goes to ElevenLabs' own separation, which hands
   *  back the band with its drums and bass still in it and the singing really gone. The
   *  phone's own clean-up stays as the fallback when the cloud separation cannot run. */
  const makeBeatOnly = useCallback(async () => {
    if (busy || !song) return;
    setError("");
    setBeatNote("");
    setBusy("stems");
    try {
      if (!song.file_uri) throw new Error("no-file");
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri: song.file_uri,
        expires_in: 900,
      });
      const res = await base44.functions.invoke("rapStems", { url: signed_url });
      const fileUri = res?.data?.file_uri;
      if (!fileUri) throw new Error(res?.data?.error || "stems");

      const { signed_url: beatUrl } = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri: fileUri,
      });
      const bytes = await fetchAudio(beatUrl);
      const bpm = song.confident ? song.bpm : settings.bpm;

      setBeat({ name: `Beat pekee · ${bpm} BPM`, bytes, file_uri: fileUri, bpm, source: "song" });
      setSettings((prev) => ({ ...prev, beat: "mine", bpm }));
      setBeatNote("Beat pekee limetenganishwa — hakuna sauti iliyobaki ndani yake.");
    } catch (err) {
      const done = await phoneBeatOnly().catch(() => false);
      setBeatNote(
        done
          ? "ElevenLabs haikuweza kutenganisha; sauti imetolewa kwenye simu — inaweza kubakiza chembe za sauti."
          : "Wimbo huu hauwezi kutenganishwa, kwa hiyo hakuna beat pekee lililobaki — jaribu “Beat kama huu” badala yake."
      );
    }
    setBusy("");
  }, [busy, phoneBeatOnly, settings.bpm, song]);

  /** Base44 AI builds a similar beat itself, at the measured tempo, in the style they picked —
   *  and keeps it, so later takes can drop it on with no rebuilding. */
  const makeSimilarBeat = useCallback(async () => {
    if (busy) return;
    setError("");
    setBeatNote("");
    setBusy("beat");
    try {
      const bpm = song?.confident ? song.bpm : settings.bpm;
      const buffer = await renderBeat({
        bpm,
        style: beatStyle,
        seconds: beatSeconds(barsFor(settings.seconds, bpm), bpm) + 2,
      });
      const blob = wavBlob(buffer);
      const bytes = await blob.arrayBuffer();
      const name = `${styleLabel(beatStyle)} · ${bpm} BPM`;
      const file = new File([blob], `${slug(name)}.wav`, { type: "audio/wav" });
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });

      setBeat({ name, bytes, file_uri, bpm, style: beatStyle, source: "ai" });
      setSettings((prev) => ({ ...prev, beat: "mine", bpm }));
      setBeatNote("Beat hii imehifadhiwa — unaweza kuitumia tena kwenye take yoyote.");

      const kept = await base44.entities.SavedBeat.create({ name, bpm, style: beatStyle, file_uri });
      setSavedBeats((prev) => [kept, ...prev]);
    } catch (err) {
      setError("Beat haikuweza kutengenezwa. Jaribu tena.");
    }
    setBusy("");
  }, [beatStyle, busy, settings.bpm, settings.seconds, song]);

  /** The bytes of a kept beat, fetched from its own private file. */
  const beatBytesOf = useCallback(async (row) => {
    const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
      file_uri: row.file_uri,
    });
    return fetchAudio(signed_url);
  }, []);

  /** A beat that was kept, straight onto the take. */
  const useSavedBeat = useCallback(
    async (row) => {
      if (busy) return;
      setError("");
      setBusy("beat");
      try {
        const bytes = await beatBytesOf(row);
        setBeat({ name: row.name, bytes, file_uri: row.file_uri, bpm: row.bpm, style: row.style, source: "ai" });
        setSettings((prev) => ({ ...prev, beat: "mine", bpm: row.bpm || prev.bpm }));
        setBeatNote(`${row.name} imewekwa chini ya take yako.`);
      } catch (err) {
        setError("Beat hii haikuweza kupakiwa. Jaribu tena.");
      }
      setBusy("");
    },
    [beatBytesOf, busy]
  );

  const removeSavedBeat = useCallback(async (row) => {
    setError("");
    try {
      await base44.entities.SavedBeat.delete(row.id);
      setSavedBeats((prev) => prev.filter((item) => item.id !== row.id));
    } catch (err) {
      setError("Beat hii haikuweza kuondolewa. Jaribu tena.");
    }
  }, []);

  /** A beat the person built by hand in the grid: kept privately like any other beat, set under the
   *  timeline, and added to the saved beats so a later take can drop it on again. */
  const useMadeBeat = useCallback(
    async (bytes, { name, bpm, style }) => {
      if (busy) return;
      setError("");
      setBeatNote("");
      setBusy("beat");
      try {
        const blob = new Blob([bytes], { type: "audio/wav" });
        const file = new File([blob], `${slug(name)}.wav`, { type: "audio/wav" });
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });

        setBeat({ name, bytes, file_uri, bpm: bpm || settings.bpm, style, source: "hand" });
        setSettings((prev) => ({ ...prev, beat: "mine", bpm: bpm || prev.bpm }));

        const kept = await base44.entities.SavedBeat.create({
          name,
          bpm: bpm || settings.bpm,
          style: style || "afro",
          file_uri,
        });
        setSavedBeats((prev) => [kept, ...prev]);
      } catch (err) {
        setError("Beat haikuweza kupakiwa. Jaribu tena.");
      }
      setBusy("");
    },
    [busy, settings.bpm]
  );

  const editLine = useCallback((index, patch) => {
    setLines((prev) => prev.map((line, at) => (at === index ? { ...line, ...patch } : line)));
  }, []);

  const toggleLock = useCallback((index) => {
    setLines((prev) => prev.map((line, at) => (at === index ? { ...line, locked: !line.locked } : line)));
  }, []);

  const keep = useCallback(
    async (next, currentLines, usedWords, onStep) => {
      onStep?.("keep", "running");
      try {
        const created = await base44.entities.RapTake.create({
          title: titleOf(currentLines, settings.topic),
          language: settings.language,
          voice: settings.voice,
          beat: settings.beat,
          bpm: settings.bpm,
          seconds: settings.seconds,
          ebembe_lines: currentLines.map((line) => line.ebembe),
          swahili_lines: currentLines.map((line) => line.swahili),
          words_used: usedWords || [],
          audio_url: next.audio_url,
          beat_file_uri: beat?.file_uri || "",
        });
        setTake((prev) => (prev ? { ...prev, id: created?.id } : prev));
        setTakes((prev) => [created, ...prev]);
        onStep?.("keep", "done");
      } catch (err) {
        // the take stays on screen even when keeping it fails
        onStep?.("keep", "failed");
      }
    },
    [beat, settings, titleOf]
  );

  /** A performance the person recorded themselves, kept with the takes: their own file, the words
   *  they sang over it, and the beat it was sung on. Their own voice is named as theirs, so a take
   *  they performed is never listed as one the studio sang. */
  const keepRecording = useCallback(
    async (row) => {
      try {
        const created = await base44.entities.RapTake.create({
          title: row.title,
          language: row.language,
          voice: "mine",
          beat: settings.beat,
          bpm: settings.bpm,
          seconds: row.seconds,
          ebembe_lines: (row.lines || []).map((line) => line.ebembe),
          swahili_lines: (row.lines || []).map((line) => line.swahili || ""),
          words_used: row.wordsUsed || [],
          audio_url: row.audio_url,
          beat_file_uri: beat?.file_uri || "",
        });
        setTakes((prev) => [created, ...prev]);
        return created;
      } catch (err) {
        return null;
      }
    },
    [beat, settings.beat, settings.bpm]
  );

  /** The sound of a take, made in one path whichever voice is set: the coins go, the key the voice
   *  sings in is found, the voice performs the bars, and the take is mixed on the phone and kept.
   *  What comes back from the singing voice has to carry a beat where the tempo says it falls: a
   *  take that was read out instead of sung is thrown away and made once more, and if the second
   *  one is no better the coins go back to the wallet and the person is told. Returns whether a
   *  take came through. */
  const takeVoice = useCallback(
    async (current, usedWords, onStep) => {
      if (!user || !current?.length) return false;
      setError("");
      setShortOnCoins(false);

      const wallet = await ensureProfile(user);
      setProfile(wallet);
      if (balanceOf(wallet) < RAP_COST) {
        setShortOnCoins(true);
        onStep?.("voice", "failed");
        setError(`Take moja inagharimu coins ${RAP_COST}, lakini wallet yako haina kiasi hicho.`);
        return false;
      }

      setBusy("voice");
      onStep?.("voice", "running");
      try {
        const spent = await spendCoins(wallet, RAP_COST);
        if (spent) setProfile(spent);

        // the key the voice sings in: the person's own beat gives it, the studio's own beat has its own
        const key =
          settings.beat === "mine" && beat?.bytes ? await keyBytes(beat.bytes) : APP_BEAT_KEY;

        // A sung take has to carry a beat where the tempo says the beat falls: a reading of the
        // lines never does, so it is no take at all. The assistant's own voice is a spoken take
        // by choice, so that one is taken as it comes.
        const sing = async () => {
          try {
            const res = await base44.functions.invoke("rapVoice", {
              lines: current.map((line) => line.ebembe),
              bpm: settings.bpm,
              beat: settings.beat,
              voice: settings.voice,
              language: settings.language,
              flow: settings.flow,
              key,
            });
            const data = res?.data || {};
            if (!data.audio_url) return null;
            if (settings.voice !== "sing") return data;

            const heard = await decodeBytes(await fetchAudio(data.song_url || data.audio_url));
            return hasBeat(heard, settings.bpm) ? data : null;
          } catch (err) {
            return null;
          }
        };

        let data = await sing();
        if (!data) data = await sing();
        if (!data) {
          const back = await creditCoins(user.email, RAP_COST);
          if (back) setProfile(back);
          onStep?.("voice", "failed");
          setError(
            `Take haikuweza kutengenezwa kwa mara mbili — coins ${RAP_COST} zimerudi kwenye wallet yako. Jaribu tena.`
          );
          return false;
        }

        const seconds = Number(data.seconds) || beatSeconds(current.length, settings.bpm);
        const vocalBytes = await fetchAudio(data.audio_url);
        const buffer = await mixTake({
          vocalBytes,
          vocalKind: data.kind,
          beatKind: settings.beat,
          beatBytes: beat?.bytes || null,
          bpm: settings.bpm,
          seconds,
        });

        const next = {
          audio_url: data.audio_url,
          kind: data.kind,
          buffer,
          mp3Url: data.kind === "song" ? data.audio_url : "",
          video_url: "",
        };
        setTake(next);
        onStep?.("voice", "done");
        await keep(next, current, usedWords, onStep);
        return true;
      } catch (err) {
        onStep?.("voice", "failed");
        setError(err?.response?.data?.error || err?.message || "Sauti haikuweza kutengenezwa.");
        return false;
      } finally {
        setBusy("");
      }
    },
    [beat, keep, settings, user]
  );

  /** The studio's own sound control: the retry after a run that did not come through, and a
   *  re-take from the player. */
  const makeVoice = useCallback(async () => {
    if (busy) return;
    await takeVoice(lines, wordsUsed, null);
  }, [busy, lines, takeVoice, wordsUsed]);

  /** Base44 AI does the whole thinking in one tap: it plans the words for the theme, settles its
   *  own angle on it, then writes that angle out in full and has the voice at Sauti perform it. */
  const generateRap = useCallback(async () => {
    if (busy || !user) return;
    startSteps();
    setBusy("plan");
    setError("");
    try {
      markStep("words", "running");
      const planned = await base44.functions.invoke("rapLyrics", {
        action: "plan",
        language: settings.language,
        topic: settings.topic,
        bars: barsFor(settings.seconds, settings.bpm),
        bpm: settings.bpm,
        flow: settings.flow,
      });
      const draft = planned?.data || {};
      const idea = draft.ideas?.[0];
      if (!idea) throw new Error(draft.error || "Mawazo hayakuja. Jaribu tena.");
      markStep("words", "done");
      markStep("angle", "done");

      setBusy("write");
      markStep("bars", "running");
      const written = await base44.functions.invoke("rapLyrics", {
        action: "write",
        idea: {
          name: idea.name,
          hook: idea.hook,
          swahili: idea.swahili,
          words_used: idea.words_used,
        },
        language: settings.language,
        topic: settings.topic,
        bars: barsFor(settings.seconds, settings.bpm),
        bpm: settings.bpm,
        flow: settings.flow,
      });
      const data = written?.data || {};
      if (!data.lines?.length) throw new Error(data.error || "Mistari haikuja. Jaribu tena.");

      let bars = data.lines.map((line) => ({ ...line, locked: false }));
      let used = data.words_used?.length ? data.words_used : idea.words_used || [];
      markStep("bars", "done");

      // every bar is checked against the saved words once more, so nothing the store does not
      // hold ever reaches the screen; a bar that still carries one is left out
      markStep("check", "running");
      try {
        const checked = await base44.functions.invoke("rapLyrics", {
          action: "check",
          lines: bars,
          flow: settings.flow,
        });
        const clean = checked?.data || {};
        if (!clean.lines?.length) throw new Error(clean.error || "Ukaguzi haukukamilika.");
        bars = clean.lines.map((line) => ({ ...line, locked: false }));
        if (clean.words_used?.length) used = clean.words_used;
        markStep("check", "done");
      } catch (err) {
        // the bars that were written are kept and the take carries on
        markStep("check", "failed");
      }

      setLines(bars);
      setWordsUsed(used);
      setTake(null);

      // the same tap carries the take on to its sound: the voice at Sauti performs the bars, and
      // the coins for the take go without a second tap
      await takeVoice(bars, used, markStep);
    } catch (err) {
      // the step the run stopped on is the one that failed
      setSteps((prev) => prev.map((step) => (step.state === "running" ? { ...step, state: "failed" } : step)));
      setError(err?.response?.data?.error || err?.message || "Rap haikuweza kutungwa. Jaribu tena.");
    }
    setRunEndedAt(Date.now());
    setBusy("");
  }, [busy, markStep, settings, startSteps, takeVoice, user]);

  const downloadAudio = useCallback(() => {
    if (!take?.buffer) return;
    saveBlob(wavBlob(take.buffer), `${slug(titleOf(lines, settings.topic))}.wav`);
  }, [lines, settings.topic, take, titleOf]);

  const downloadMp3 = useCallback(() => {
    if (!take?.mp3Url) return;
    saveRemote(take.mp3Url, `${slug(titleOf(lines, settings.topic))}.mp3`);
  }, [lines, settings.topic, take, titleOf]);

  const downloadLyrics = useCallback(() => {
    const text = takeText(titleOf(lines, settings.topic), lines, wordsUsed);
    saveBlob(new Blob([text], { type: "text/plain" }), `${slug(titleOf(lines, settings.topic))}.txt`);
  }, [lines, settings.topic, titleOf, wordsUsed]);

  /** The video is recorded on the phone from the take's own sound, then kept with it. */
  const makeVideo = useCallback(async () => {
    if (busy || !take?.buffer) return;
    setBusy("video");
    setError("");
    try {
      const file = await recordTake({
        wavBlob: wavBlob(take.buffer),
        lines,
        title: titleOf(lines, settings.topic),
      });
      saveBlob(file, videoName(titleOf(lines, settings.topic), file.type));

      const named = new File([file], videoName(titleOf(lines, settings.topic), file.type), {
        type: file.type,
      });
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file: named });
      setTake((prev) => (prev ? { ...prev, video_url: file_url } : prev));
      if (take.id) {
        await base44.entities.RapTake.update(take.id, { video_url: file_url });
        setTakes((prev) => prev.map((row) => (row.id === take.id ? { ...row, video_url: file_url } : row)));
      }
    } catch (err) {
      if (err?.message === "video-unsupported") {
        // a phone that cannot record a video at all keeps the take as its audio file
        saveBlob(wavBlob(take.buffer), `${slug(titleOf(lines, settings.topic))}.wav`);
        setError("Kifaa hiki hakiwezi kutengeneza video — take yako imehifadhiwa kama faili la sauti.");
      } else {
        setError("Video haikuweza kutengenezwa. Jaribu tena.");
      }
    }
    setBusy("");
  }, [busy, lines, settings.topic, take, titleOf]);

  const reuse = useCallback((saved) => {
    setLines(
      (saved.ebembe_lines || []).map((ebembe, index) => ({
        section: "",
        ebembe,
        swahili: (saved.swahili_lines || [])[index] || "",
        locked: false,
      }))
    );
    setWordsUsed(saved.words_used || []);
    setSettings((prev) => ({
      ...prev,
      bpm: saved.bpm || prev.bpm,
      seconds: saved.seconds || prev.seconds,
      beat: saved.beat || prev.beat,
      // a take the person performed themselves carries their own voice; the studio keeps the voice
      // chosen for the takes it sings itself
      voice: saved.voice === "sing" || saved.voice === "agent" ? saved.voice : prev.voice,
      language: saved.language || prev.language,
      topic: saved.title || prev.topic,
    }));
    setTake(null);
    setError("");
  }, []);

  return {
    user,
    profile,
    words,
    wordsUsed,
    settings,
    setSettings,
    lines,
    take,
    takes,
    beat,
    song,
    savedBeats,
    beatStyle,
    setBeatStyle,
    beatNote,
    busy,
    error,
    shortOnCoins,
    steps,
    runStartedAt,
    runEndedAt,
    setBeatFile,
    sendSong,
    makeBeatOnly,
    makeSimilarBeat,
    beatBytesOf,
    useSavedBeat,
    removeSavedBeat,
    useMadeBeat,
    generateRap,
    editLine,
    toggleLock,
    makeVoice,
    makeVideo,
    downloadAudio,
    downloadMp3,
    downloadLyrics,
    reuse,
    keepRecording,
  };
}