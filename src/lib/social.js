import { base44 } from "@/api/base44Client";

export function nowIso() {
  return new Date().toISOString();
}

export function usernameFrom(user) {
  const base = String(user?.full_name || (user?.email || "").split("@")[0] || "friend")
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, 20);
  return base || "friend";
}

/** Everyone gets one public profile — created the first time they open a social screen. */
export async function ensureProfile(user) {
  const page = await base44.entities.Profile.filter({ user_email: user.email }, { limit: 1 });
  const existing = page?.items?.[0];
  if (existing) return existing;
  return base44.entities.Profile.create({
    user_email: user.email,
    username: usernameFrom(user),
    avatar_url: "",
  });
}

export async function publicFile(file) {
  const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
  return file_url;
}

export function reelLink(id) {
  return `${window.location.origin}/reels?reel=${id}`;
}

export function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** aggregate rows ({reel_id, count}) → { reelId: count } */
export function countMap(rows) {
  const map = {};
  (rows || []).forEach((row) => {
    map[row.reel_id] = row.count || 0;
  });
  return map;
}