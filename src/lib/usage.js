import { base44 } from "@/api/base44Client";

export const GUEST_LIMIT = 2;
export const DAILY_LIMIT = 5;
export const WINDOW_MS = 24 * 60 * 60 * 1000;

const GUEST_KEY = "vv_guest_messages";

// Fallback for browsers that block storage (private mode, embedded previews):
// the stamps live in memory for this session instead of breaking the tap.
let memoryGuest = [];

/** Only the messages used inside the last 24 hours count — the older ones have come back. */
export function liveStamps(stamps, now = Date.now()) {
  return (Array.isArray(stamps) ? stamps : [])
    .filter((stamp) => Number.isFinite(stamp) && now - stamp < WINDOW_MS)
    .sort((a, b) => a - b);
}

/** What the allowance looks like right now: messages left, and when the next one returns. */
export function creditsFrom(stamps, limit, now = Date.now()) {
  const live = liveStamps(stamps, now);
  return {
    remaining: Math.max(0, limit - live.length),
    nextReturnAt: live.length >= limit ? live[0] + WINDOW_MS : null,
  };
}

export function formatWait(ms) {
  const minutes = Math.max(0, Math.ceil(ms / 60000));
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

// —— guests: the same one-in, one-out rule, kept on the device ——

export function getGuestStamps() {
  try {
    const stored = JSON.parse(localStorage.getItem(GUEST_KEY) || "[]");
    if (Array.isArray(stored) && stored.length > memoryGuest.length) memoryGuest = stored;
  } catch (err) {
    // storage unavailable — the stamps live in memory for this session
  }
  return memoryGuest;
}

export function addGuestStamp() {
  const now = Date.now();
  memoryGuest = [...liveStamps(getGuestStamps(), now), now];
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(memoryGuest));
  } catch (err) {
    // storage unavailable — the stamps live in memory for this session
  }
  return memoryGuest;
}

// —— signed in: one record per answered message, kept on the server ——

function isoOf(ms) {
  return new Date(ms).toISOString();
}

export async function loadUserStamps(email) {
  const now = Date.now();
  const page = await base44.entities.UsageRecord.filter(
    { user_email: email, used_at: { $gte: isoOf(now - WINDOW_MS) } },
    { sort: "used_at", limit: 50, fields: ["used_at"] }
  );
  const stamps = (page?.items || []).map((record) => Date.parse(record.used_at));
  return liveStamps(stamps, now);
}

export async function spendCredit(email) {
  const usedAt = isoOf(Date.now());
  await base44.entities.UsageRecord.create({ user_email: email, used_at: usedAt });
  return Date.parse(usedAt);
}

/** Clears messages that have already come back, so only the live window is ever kept. */
export async function pruneUsage(email) {
  await base44.entities.UsageRecord.deleteMany({
    user_email: email,
    used_at: { $lt: isoOf(Date.now() - WINDOW_MS) },
  });
  await base44.entities.UsageRecord.deleteMany({
    user_email: email,
    used_at: { $exists: false },
  });
}