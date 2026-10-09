/**
 * The master corpus, turned into the one document the AIs read.
 *
 * The admin's file is written for a person: headings, tables, picture cards, numbered lists — and the
 * same material copied into it more than once, under an "Archive source" heading. The document the app
 * reads is written for the AIs: four parts under their own headings, RULES · WORDS · PHRASES ·
 * KNOWLEDGE, where a word stands as one line — `word (how it sounds) = meaning | how it is used` — and
 * everything else is what the AIs answer from.
 *
 * Nothing is thrown away except what is *provably a copy*: a part whose text is exactly the text of a
 * part already kept is dropped, and the original file itself stays openable beside the document.
 * Everything the sources kept as an archive copy is kept too, marked `[archive copy]` on its lines, so
 * an AI reads it as the older record it is and never lets it stand over the admin's newer correction.
 * What the sources have not settled is marked `[not confirmed]` for the same reason.
 */

const HEADING = /^#{1,6}[ \t]+(.+?)[ \t]*$/;
const SEPARATOR = /^\s*(?:-{3,}|={3,}|\*{3,})\s*$/;
const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_SEP = /^\s*\|[\s:|–—-]+\|\s*$/;
const BLANK = /_{3,}/;
const CARD =
  /^(?:#{1,6}\s*)?(NUMBER|EBEMBE|KIBEMBE|ENGLISH MEANING|AMERICAN[- ]ENGLISH PRONUNCIATION|PRONUNCIATION|READING|STATUS)\s*:?\s*$/i;

const PHRASE_HEAD =
  /(phrases?|expressions?|sayings?|sentences?|proverbs?|misemo|msemo|methali|sentensi|maamkizi|greeting|commands?|creative)/i;
const WORD_HEAD = /(words?|word list|vocabulary|index|maneno|msamiati|dictionary|kamusi)/i;
const RULE_HEAD =
  /(rules?|sheria|kanuni|sarufi|matamshi|grammar|reading|pronun|alphabet|herufi|mamlaka|authority|must obey|instructions?|namna ya)/i;

const NOT_CONFIRMED =
  /RECOGNITION-ONLY|not authority|GLOIRE TO PROVIDE|unconfirmed|not yet confirmed|still to (?:be )?(?:added|provided|taught|confirmed)|hajathibitishwa/i;
const SUPERSEDED = /SUPERSEDED/i;
const READ_RULE = /read as|as in|pronounc|sounds like|it is said/i;

const ARCHIVE = "[older source file]";
const ARCHIVE_HEAD =
  "[the original file kept under this heading, word for word — its own words stand beside everything else in this document, and the admin's newest correction stands over both]";

const MAX_FORM = 70;
const DUPLICATE_AT = 200;

/** One line as plain text: the marks a person reads around it are not part of what it says. */
function tidy(value) {
  return String(value == null ? "" : value)
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*`]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/** The cells of one table row. */
function cells(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => tidy(cell));
}

/** What a column of a table holds, read from the name the table gives it. */
function roleOf(cell) {
  const name = tidy(cell).toLowerCase();
  if (!name) return "other";
  if (/pronunc|american|reading|how to say|matamshi|sound/.test(name)) return "guide";
  if (/kibembe|ebembe|\bform\b|source form/.test(name)) return "form";
  if (/english|meaning|maana|gloss|translation|tafsiri/.test(name)) return "meaning";
  if (/swahili|kiswahili/.test(name)) return "swa";
  if (/matumizi|usage|note|remarks?|status|recorded|hifadhiwa|context/.test(name)) return "usage";
  return "other";
}

/** One row of a table as a word: its spelling, its reading, what it means and how it is used. */
function rowOf(cellsArr, roles) {
  const taken = cellsArr.map(() => false);
  let form = "";

  cellsArr.forEach((cell, i) => {
    if (!cell || form || (roles[i] || "other") !== "form") return;
    form = cell;
    taken[i] = true;
  });
  if (!form) {
    const at = cellsArr.findIndex(
      (cell, i) => cell && !taken[i] && !/^(form|kibembe|ebembe|english|kiswahili)$/i.test(cell)
    );
    if (at >= 0) {
      form = cellsArr[at];
      taken[at] = true;
    }
  }
  if (!form) return null;

  let guide = "";
  let meaning = "";
  cellsArr.forEach((cell, i) => {
    if (!cell || taken[i] || (roles[i] || "other") !== "guide" || guide) return;
    guide = cell;
    taken[i] = true;
  });
  // what it means is read in English first, and only then from the Kiswahili beside it
  ["meaning", "swa"].forEach((role) => {
    if (meaning) return;
    cellsArr.forEach((cell, i) => {
      if (meaning || !cell || taken[i] || (roles[i] || "other") !== role) return;
      meaning = role === "swa" ? `${cell} (Kiswahili)` : cell;
      taken[i] = true;
    });
  });

  return { form, guide, meaning, usage: cellsArr.filter((cell, i) => cell && !taken[i]).join(" · ") };
}

/** One word as the line the document holds it in. */
function wordLine(row) {
  const form = tidy(row && row.form).slice(0, MAX_FORM);
  if (!form || form.includes("=")) return "";
  const guide = tidy(row && row.guide).slice(0, 90);
  const label = row && row.label ? `${row.label} ` : "";
  const meaning = tidy(row && row.meaning);
  const held = tidy(row && row.usage);
  const usage = held && held !== tidy(row && row.form) ? held : "";
  const said = [meaning ? `${label}${meaning}` : label.trim(), usage].filter(Boolean).join(" | ");
  return `${form}${guide ? ` (${guide})` : ""}${said ? ` = ${said}` : ""}`;
}

/** The mark a line carries when its own words say it is not settled yet. */
function labelOf(text) {
  if (NOT_CONFIRMED.test(String(text || ""))) return "[not confirmed]";
  if (SUPERSEDED.test(String(text || ""))) return "[superseded by a newer correction]";
  return "";
}

/** One line of the document, marked when it says of itself that it is not settled yet. */
function keptLine(raw) {
  const line = tidy(raw);
  if (!line) return "";
  const label = labelOf(line);
  return label && line.indexOf(label) !== 0 ? `${label} ${line}` : line;
}

/** The file cut into the parts it is written in, each part under the heading it names. */
function blocksOf(text) {
  const blocks = [];
  let head = "";
  let level = 0;
  let lines = [];

  const keep = () => {
    if (head || lines.some((line) => line.trim())) blocks.push({ head, level, lines });
  };

  String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .forEach((raw) => {
      const opened = raw.match(HEADING);
      if (opened) {
        const marks = (raw.match(/^#+/) || ["#"])[0].length;
        const name = tidy(opened[1]);
        // a picture card's own field names belong to the card, never to the document
        if (marks >= 3 && CARD.test(name)) {
          lines.push(raw);
          return;
        }
        keep();
        head = name;
        level = marks;
        lines = [];
        return;
      }
      if (SEPARATOR.test(raw)) return;
      lines.push(raw);
    });
  keep();

  return blocks;
}

/** Which of the document's four parts a part of the file belongs to. */
function kindOf(head, body) {
  const name = String(head || "");
  const text = String(body || "");
  if (/^archive source/i.test(name)) return "knowledge";
  if (PHRASE_HEAD.test(name) && !WORD_HEAD.test(name)) return "phrases";
  if (WORD_HEAD.test(name)) return "words";
  if (RULE_HEAD.test(name)) return "rules";
  // the file's own opening, before any heading: what the sources say must be obeyed
  if (!name && /MUST OBEY|authority|mamlaka|SHERIA|KANUNI/i.test(text)) return "rules";
  // a part written as picture cards, or as a table of forms, is a part of words whatever it is called
  const cards = (text.match(/^(?:#{1,6}\s*)?(?:NUMBER|EBEMBE|KIBEMBE|ENGLISH MEANING)\s*:?\s*$/gim) || [])
    .length;
  if (cards >= 2 || /^\s*\|.*\|/m.test(text)) {
    if (/\*\*Kibembe|\*\*Kiswahili/i.test(text)) return "phrases";
    return "words";
  }
  if (/\*\*Kibembe|\*\*Kiswahili/i.test(text)) return "phrases";
  return "knowledge";
}

/** The words a part of the file holds: its picture cards, its tables, and its own word lines. */
function wordsOfBlock(mark, lines, head) {
  const used = lines.map(() => false);
  const words = [];
  const pending = [];
  const records = [];
  const readingRules = [];
  let blanks = 0;
  const record = /^(IMG|AUD|VID|image|record|rekodi)/i.test(String(head || "")) ? tidy(head) : "";

  // picture cards: a marker line, and the line under it as what the marker names
  const cards = [];
  lines.forEach((raw, i) => {
    const found = tidy(raw).match(CARD);
    if (!found) return;
    let at = -1;
    for (let j = i + 1; j < lines.length; j += 1) {
      if (!tidy(lines[j])) continue;
      if (tidy(lines[j]).match(CARD)) break;
      at = j;
      break;
    }
    const name = found[1].toUpperCase();
    used[i] = true;
    if (at < 0) return;
    // the count a card carries is not a word, and neither is the line under it
    if (/^NUMBER/.test(name)) {
      used[at] = true;
      return;
    }
    cards.push({ name, value: tidy(lines[at]) });
    used[at] = true;
  });

  let card = null;
  const flush = () => {
    if (card && card.form && (card.meaning || card.guide)) {
      words.push({
        form: card.form,
        guide: card.guide || "",
        meaning: card.meaning || "",
        usage: "",
        label: labelOf(card.status || "") || labelOf(`${card.form} ${card.meaning || ""}`),
      });
    }
    card = null;
  };
  cards.forEach((entry) => {
    if (/^(EBEMBE|KIBEMBE)/.test(entry.name) && card && card.form) flush();
    if (!card) card = {};
    if (/^(EBEMBE|KIBEMBE)/.test(entry.name)) card.form = entry.value;
    if (/ENGLISH MEANING/.test(entry.name)) card.meaning = entry.value;
    if (/PRONUNCIATION|READING/.test(entry.name)) card.guide = card.guide || entry.value;
    if (/STATUS/.test(entry.name)) card.status = entry.value;
  });
  flush();

  const takeRow = (row) => {
    const said = `${row.guide} ${row.meaning} ${row.usage}`;
    // the letters of the alphabet and how they are said are the rules of reading, not words
    if (row.form.length <= 3 && READ_RULE.test(said)) {
      readingRules.push(`${row.form} = ${tidy(said)}`);
      return;
    }
    // a picture record is kept as the record it is, never taught as a word
    if (/^(IMG|AUD|VID)[-_ ]?\d+/i.test(row.form)) {
      records.push(tidy([row.form, row.meaning, row.usage].filter(Boolean).join(" · ")));
      return;
    }
    if (BLANK.test(row.form)) {
      const real = [row.guide, row.meaning, row.usage].filter((value) => value && !BLANK.test(value));
      if (real.length) pending.push(tidy([row.form, ...real].join(" · ")));
      else blanks += 1;
      return;
    }
    words.push({
      ...row,
      usage: [record, row.usage].filter(Boolean).join(" · "),
      label: labelOf(`${row.form} ${row.meaning} ${row.usage}`),
    });
  };

  // tables: the first row names the columns, every row under it is a word
  let at = 0;
  while (at < lines.length) {
    if (!TABLE_ROW.test(lines[at])) {
      at += 1;
      continue;
    }
    let end = at;
    while (end < lines.length && TABLE_ROW.test(lines[end])) end += 1;
    const rows = lines
      .slice(at, end)
      .filter((line) => !TABLE_SEP.test(line))
      .map(cells);
    used.fill(true, at, end);
    if (rows.length > 1) {
      const roles = rows[0].map(roleOf);
      rows.slice(1).forEach((cellsArr) => {
        const row = rowOf(cellsArr, roles);
        if (row) takeRow(row);
      });
    }
    at = end;
  }

  // the file's own word lines: a form on the left of an equals sign, what it means on the right
  lines.forEach((raw, i) => {
    if (used[i]) return;
    const line = tidy(raw)
      .replace(/^[-•]\s*/, "")
      .replace(/^\d+[.)]\s*/, "");
    const cut = line.indexOf("=");
    if (cut < 3) return;
    const form = line.slice(0, cut).trim();
    const said = line.slice(cut + 1).trim();
    if (!said || form.length > MAX_FORM || /[.!?]$/.test(form) || form.split(" ").length > 5) return;
    used[i] = true;
    if (BLANK.test(form)) {
      const real = said.split("|").map(tidy).filter((value) => value && !BLANK.test(value));
      if (real.length) pending.push(tidy([form, ...real].join(" · ")));
      else blanks += 1;
      return;
    }
    const held = form.match(/\(([^()]*)\)/);
    words.push({
      form: form.replace(/\([^()]*\)/g, " "),
      guide: held ? held[1] : "",
      meaning: said,
      usage: record,
      label: labelOf(raw),
    });
  });

  if (mark && words.length) words.forEach((row) => (row.archive = true));

  return { words, pending, records, readingRules, blanks, used };
}

/** The phrases a part of the file holds: its proverbs, its tables and its own phrase lines. */
function phrasesOfBlock(lines) {
  const used = lines.map(() => false);
  const phrases = [];

  // a proverb names its own language — Kibembe — and the meaning stands under it
  lines.forEach((raw, i) => {
    const opened = tidy(raw).match(/^(?:\d+[.)]\s*)?Kibembe\s*:?\s*(.+)$/i);
    if (!opened || !tidy(opened[1])) return;
    const saidAt = [];
    let mean = "";
    let swa = "";
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j += 1) {
      const said = tidy(lines[j]).match(/^(?:[-•]\s*)?(Kiswahili|English|Swahili)\s*:?\s*(.+)$/i);
      if (!said) continue;
      if (/^kiswahili|^swahili/i.test(said[1])) swa = tidy(said[2]);
      else mean = tidy(said[2]);
      saidAt.push(j);
    }
    // a line that only begins with the word Kibembe is prose, and stays what it is
    if (!mean && !swa) return;
    used[i] = true;
    saidAt.forEach((j) => (used[j] = true));
    phrases.push({
      form: tidy(opened[1]),
      guide: "",
      meaning: mean || swa,
      usage: swa && mean ? `Kiswahili: ${swa}` : "",
      label: labelOf(raw),
    });
  });

  let at = 0;
  while (at < lines.length) {
    if (!TABLE_ROW.test(lines[at])) {
      at += 1;
      continue;
    }
    let end = at;
    while (end < lines.length && TABLE_ROW.test(lines[end])) end += 1;
    const rows = lines
      .slice(at, end)
      .filter((line) => !TABLE_SEP.test(line))
      .map(cells);
    used.fill(true, at, end);
    if (rows.length > 1) {
      const roles = rows[0].map(roleOf);
      rows.slice(1).forEach((cellsArr) => {
        const row = rowOf(cellsArr, roles);
        if (row && !BLANK.test(row.form)) phrases.push({ ...row, label: labelOf(cellsArr.join(" ")) });
      });
    }
    at = end;
  }

  lines.forEach((raw, i) => {
    if (used[i]) return;
    const line = tidy(raw)
      .replace(/^[-•]\s*/, "")
      .replace(/^\d+[.)]\s*/, "");
    const cut = line.indexOf("=");
    if (cut < 3) return;
    const form = line.slice(0, cut).trim();
    const said = line.slice(cut + 1).trim();
    if (!said) return;
    used[i] = true;
    phrases.push({ form, guide: "", meaning: said, usage: "", label: labelOf(raw) });
  });

  return { phrases, used };
}

/** The whole file as the document the AIs read, and how much of it went where. */
export function shapeCorpus(raw) {
  const blocks = blocksOf(raw);
  const kept = [];
  let duplicates = 0;
  let droppedChars = 0;

  blocks.forEach((block) => {
    const body = block.lines.join("\n").replace(/\n{2,}/g, "\n").trim();
    if (body.length >= DUPLICATE_AT) {
      const key = tidy(block.lines.join(" ")).toLowerCase();
      if (kept.some((row) => tidy(row.body).toLowerCase() === key)) {
        duplicates += 1;
        droppedChars += body.length;
        return;
      }
    }
    kept.push({ ...block, body });
  });

  const rules = [];
  const words = [];
  const phrases = [];
  const knowledge = [];
  const seen = new Map();
  const stats = {
    duplicates,
    droppedChars,
    archiveParts: 0,
    notConfirmed: 0,
    otherForm: 0,
    pending: 0,
    blanks: 0,
    records: 0,
    sections: kept.length,
  };

  let archive = "";
  kept.forEach((block) => {
    // the archive copies are the older files kept at the end of the master file, one after another
    if (block.level === 2 && /^archive source/i.test(block.head)) archive = block.head;
    if (archive) stats.archiveParts += 1;

    const kind = kindOf(block.head, block.body);
    const lines = block.body.split("\n");
    const label = block.head ? `## ${block.head}` : "## From the file";
    const mark = archive ? ARCHIVE : "";
    if (archive && archive === block.head) {
      knowledge.push(label, ARCHIVE_HEAD, "");
      return;
    }
    const left = [];

    if (kind === "rules") {
      // a rule is an instruction, never an entry: it is never marked as an unsettled thing
      rules.push(archive ? `${label} ${ARCHIVE}` : label, ...lines.map(tidy).filter(Boolean), "");
      return;
    }

    if (kind === "words") {
      const found = wordsOfBlock(mark, lines, block.head);
      found.words.forEach((row) => {
        const line = `${wordLine(row)}${row.archive ? ` ${ARCHIVE}` : ""}`;
        if (!line.trim()) return;
        const key = tidy(row.form).toLowerCase();
        const before = seen.get(key);
        if (before === line) return;
        if (before) {
          stats.otherForm += 1;
          words.push(`${line} | [another form]`);
          return;
        }
        seen.set(key, line);
        words.push(line);
      });
      found.readingRules.forEach((line) => rules.push(line));
      found.records.forEach((line) => {
        stats.records += 1;
        knowledge.push(`[picture record] ${line}`);
      });
      found.pending.forEach((said) => {
        stats.pending += 1;
        knowledge.push(`[not confirmed] ${said}`);
      });
      if (found.blanks) {
        stats.blanks += found.blanks;
        knowledge.push(
          `[not confirmed] ${found.blanks} rows of this part carry no form yet — the form is still to be provided`
        );
      }
      lines.forEach((raw, i) => {
        if (!found.used[i]) left.push(keptLine(raw));
      });
    } else if (kind === "phrases") {
      const found = phrasesOfBlock(lines);
      found.phrases.forEach((row) => {
        const line = wordLine(row);
        if (line) phrases.push(archive ? `${line} ${ARCHIVE}` : line);
      });
      lines.forEach((raw, i) => {
        if (!found.used[i]) left.push(keptLine(raw));
      });
    } else {
      lines.forEach((raw) => left.push(keptLine(raw)));
    }

    const body = left.filter(Boolean).join("\n").replace(/\n{2,}/g, "\n").trim();
    if (!body) return;
    knowledge.push(`${label}${archive ? ` ${ARCHIVE}` : ""}`, body, "");
  });

  const counted = (text) => (text.match(/\[not confirmed\]/g) || []).length;
  stats.notConfirmed =
    counted(rules.join("\n")) +
    counted(words.join("\n")) +
    counted(phrases.join("\n")) +
    counted(knowledge.join("\n"));

  const text = [
    "# RULES",
    // said plainly, in the document itself, so every AI reads it as the first thing it is given
    "[how this document is read] A line marked [not confirmed] is kept for the record only: never teach it as something known, and never let it stand over a correction the admin confirmed. A line marked [another form] is kept beside the form of the same word already held: the one written first stands. A line marked [older source file] comes from one of the original files kept at the end of this document, word for word. Everything else in # RULES is the law of the language and is followed exactly.",
    ...rules,
    "",
    "# WORDS",
    "# one line for each word:  ebembe word (how it sounds) = meaning | how it is used",
    ...words,
    "",
    "# PHRASES",
    "# one line for each phrase:  kibembe phrase = meaning",
    ...phrases,
    "",
    "# KNOWLEDGE",
    "# everything else the assistant must know: the teaching order, the records, and what is still to be confirmed",
    ...knowledge,
    "",
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  return {
    text,
    stats: {
      ...stats,
      chars: text.length,
      rulesLines: rules.length,
      wordsLines: words.length,
      phraseLines: phrases.length,
      knowledgeLines: knowledge.length,
    },
  };
}