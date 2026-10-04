/** The files a take leaves behind: the words as text, and the take itself. */

import { fetchAudio } from "@/lib/rapAudio";

export function slug(text) {
  const base = String(text || "ebembe-rap")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "ebembe-rap";
}

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** A file that lives online is fetched and saved; when it can't be, it is simply opened. */
export async function saveRemote(url, filename) {
  try {
    const bytes = await fetchAudio(url);
    saveBlob(new Blob([bytes], { type: "audio/mpeg" }), filename);
  } catch (err) {
    window.open(url, "_blank");
  }
}

/** The lines with their meanings, and the words the rap was built from. */
export function takeText(title, lines, wordsUsed) {
  const body = (lines || [])
    .map((line, index) => `${index + 1}. ${line.ebembe}\n   ${line.swahili || ""}`)
    .join("\n");
  const words = (wordsUsed || []).length
    ? `\n\nManeno yaliyotumika:\n${wordsUsed.map((word) => `- ${word}`).join("\n")}`
    : "";
  return `${title}\n\n${body}${words}\n`;
}

/** The file a video take saves as, from what the phone could record. */
export function videoName(title, type) {
  return `${slug(title)}.${String(type || "").includes("mp4") ? "mp4" : "webm"}`;
}