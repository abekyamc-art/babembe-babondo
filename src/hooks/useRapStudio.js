import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { RAP_COST, balanceOf, spendCoins } from "@/lib/coins";
import { ensureProfile } from "@/lib/social";
import { DEFAULT_BPM, beatSeconds } from "@/lib/rapBeat";
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
    beat: "app",
    bpm: DEFAULT_BPM,
    bars: 16,
    topic: "",
  });
  const [lines, setLines] = useState([]);
  const [plan, setPlan] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [picked, setPicked] = useState(-1);
  const [take, setTake] = useState(null);
  const [takes, setTakes] = useState([]);
  const [beat, setBeat] = useState(null);
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

  /** Base44 AI plans the words first, then offers a few different angles on the theme. */
  const planIdeas = useCallback(async () => {
    if (busy || !user) return;
    setBusy("plan");
    setError("");
    try {
      const res = await base44.functions.invoke("rapLyrics", {
        action: "plan",
        topic: settings.topic,
        bars: settings.bars,
        bpm: settings.bpm,
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
          topic: settings.topic,
          bars: settings.bars,
          bpm: settings.bpm,
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
          voice: settings.voice,
          beat: settings.beat,
          bpm: settings.bpm,
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

  /** The singing voice takes the lines, then the take is mixed on the phone. */
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

      const res = await base44.functions.invoke("rapVoice", {
        lines: current.map((line) => line.ebembe),
        bpm: settings.bpm,
        beat: settings.beat,
        voice: settings.voice,
      });
      const data = res?.data || {};
      if (!data.audio_url) throw new Error(data.error || "Sauti haikuja. Jaribu tena.");

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
      setError(
        err?.message === "video-unsupported"
          ? "Kifaa hiki hakiwezi kutengeneza video — pakua faili la sauti badala yake."
          : "Video haikuweza kutengenezwa. Jaribu tena."
      );
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
      beat: saved.beat || prev.beat,
      voice: saved.voice || prev.voice,
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
    busy,
    error,
    shortOnCoins,
    setBeatFile,
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