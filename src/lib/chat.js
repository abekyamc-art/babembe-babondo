import { base44 } from "@/api/base44Client";

/** Two people always share one thread, whichever way round they are listed. */
export function threadKey(a, b) {
  return [a, b].filter(Boolean).sort().join("|");
}

export function otherMember(thread, meEmail) {
  return (thread?.members || []).find((email) => email !== meEmail) || meEmail;
}

export async function openThread(meEmail, otherEmail) {
  const key = threadKey(meEmail, otherEmail);
  const page = await base44.entities.ChatThread.filter({ key }, { limit: 1 });
  const existing = page?.items?.[0];
  const members = [meEmail, otherEmail];
  if (existing) {
    const listed = existing.members || [];
    if (!listed.includes(meEmail) || !listed.includes(otherEmail)) {
      return base44.entities.ChatThread.update(existing.id, { members });
    }
    return existing;
  }
  return base44.entities.ChatThread.create({
    key,
    members,
    last_text: "",
    last_kind: "text",
    last_at: new Date().toISOString(),
  });
}

export function threadMessages(threadId) {
  return base44.entities.ChatMessage.filter(
    { thread_id: threadId },
    { sort: "created_date", limit: 100 }
  ).then((page) => page?.items || []);
}

async function touch(thread, patch, senderEmail) {
  await base44.entities.ChatThread.update(thread.id, {
    ...patch,
    last_sender_email: senderEmail,
    last_at: new Date().toISOString(),
  });
}

export async function sendText(thread, meEmail, text) {
  const message = await base44.entities.ChatMessage.create({
    thread_id: thread.id,
    members: thread.members,
    sender_email: meEmail,
    kind: "text",
    text,
  });
  await touch(thread, { last_text: text, last_kind: "text" }, meEmail);
  return message;
}

export async function sendPhoto(thread, meEmail, file) {
  const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
  const message = await base44.entities.ChatMessage.create({
    thread_id: thread.id,
    members: thread.members,
    sender_email: meEmail,
    kind: "photo",
    text: "",
    file_uri,
  });
  await touch(thread, { last_text: "Photo", last_kind: "photo" }, meEmail);
  return message;
}

/** Private photos open through a short-lived link, kept briefly in memory. */
const urls = new Map();

export async function photoUrl(fileUri) {
  const held = urls.get(fileUri);
  if (held && held.until > Date.now()) return held.url;
  const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
    file_uri: fileUri,
    expires_in: 3600,
  });
  urls.set(fileUri, { url: signed_url, until: Date.now() + 30 * 60 * 1000 });
  return signed_url;
}

export function previewOf(thread) {
  if (!thread) return "";
  if (thread.last_kind === "photo") return "Photo";
  return thread.last_text || "Say hello";
}