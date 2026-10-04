import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { RAP_COST, balanceOf, creditCoins, spendCoins } from "@/lib/coins";
import { DEFAULT_LANGUAGE } from "@/lib/rapLanguage";
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
  const [plan, setPlan] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [picked, setPicked] = useState(-1);
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

  /** Base44 AI plans the words first, then offers a few different angles on the theme. */
  const planIdeas = useCallback(async () => {
    if (busy || !user) return;
    setBusy("plan");
    setError("");
    try {
      const res = await base44.functions.invoke("rapLyrics", {
        action: "plan",
        language: settings.language,
        topic: settings.topic,
        bars: barsFor(settings.seconds, settings.bpm),
        bpm: settings.bpm,
        flow: settings.flow,
      });
      const data = res?.data || {};
      if (!data.ideas?.length) throw new Error(data.error || "Mawazo hayakuja. Jaribu tena.");
      setPlan(data.plan || []);
      setIdeas(data.ideas);
      setPicked(-1);
      setLines([]);
      setWordsUsed([]);
      setTake(null);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Mawazo hayakuweza kutengenezwa.");
    }
    setBusy("");
  }, [busy, settings, user]);

  /** The chosen angle written out in full, against the very words its own plan named. */
  const writeIdea = useCallback(
    async (index) => {
      const idea = ideas[index];
      if (busy || !idea) return;
      setBusy("write");
      setError("");
      try {
        const res = await base44.functions.invoke("rapLyrics", {
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
        const data = res?.data || {};
        if (!data.lines?.length) throw new Error(data.error || "Mistari haikuja. Jaribu tena.");
        setLines(data.lines.map((line) => ({ ...line, locked: false })));
        setWordsUsed(data.words_used?.length ? data.words_used : idea.words_used || []);
        setPicked(index);
        setTake(null);
      } catch (err) {
        setError(err?.response?.data?.error || err?.message || "Wazo hili halikuweza kuandikwa.");
      }
      setBusy("");
    },
    [busy, ideas, settings]
  );

  const editLine = useCallback((index, patch) => {
    setLines((prev) => prev.map((line, at) => (at === index ? { ...line, ...patch } : line)));
  }, []);

  const toggleLock = useCallback((index) => {
    setLines((prev) => prev.map((line, at) => (at === index ? { ...line, locked: !line.locked } : line)));
  }, []);

  const keep = useCallback(
    async (next, currentLines) => {
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
          words_used: wordsUsed,
          audio_url: next.audio_url,
          beat_file_uri: beat?.file_uri || "",
        });
        setTake((prev) => (prev ? { ...prev, id: created?.id } : prev));
        setTakes((prev) => [created, ...prev]);
      } catch (err) {
        // the take stays on screen even when keeping it fails
      }
    },
    [beat, settings, titleOf, wordsUsed]
  );

  /** The singing voice takes the lines, then the take is mixed on the phone. What comes back
   *  has to carry a beat where the tempo says it falls: a take that was read out instead of
   *  sung is thrown away and made once more, and if the second one is no better the coins go
   *  back to the wallet and the person is told. */
  const makeVoice = useCallback(async () => {
    if (busy || !user || !lines.length) return;
    setError("");
    setShortOnCoins(false);

    const wallet = await ensureProfile(user);
    setProfile(wallet);
    if (balanceOf(wallet) < RAP_COST) {
      setShortOnCoins(true);
      setError(`Take moja inagharimu coins ${RAP_COST}, lakini wallet yako haina kiasi hicho.`);
      return;
    }

    setBusy("voice");
    const current = lines;
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
        setError(
          `Take haikuweza kutengenezwa kwa mara mbili — coins ${RAP_COST} zimerudi kwenye wallet yako. Jaribu tena.`
        );
        setBusy("");
        return;
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
      await keep(next, current);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Sauti haikuweza kutengenezwa.");
    }
    setBusy("");
  }, [beat, busy, keep, lines, settings, user]);

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
      voice: saved.voice || prev.voice,
      language: saved.language || prev.language,
      topic: saved.title || prev.topic,
    }));
    setPlan([]);
    setIdeas([]);
    setPicked(-1);
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
    plan,
    ideas,
    picked,
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
    setBeatFile,
    sendSong,
    makeBeatOnly,
    makeSimilarBeat,
    beatBytesOf,
    useSavedBeat,
    removeSavedBeat,
    planIdeas,
    writeIdea,
    editLine,
    toggleLock,
    makeVoice,
    makeVideo,
    downloadAudio,
    downloadMp3,
    downloadLyrics,
    reuse,
  };
}