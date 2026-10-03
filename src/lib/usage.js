import { base44 } from "@/api/base44Client";

export const GUEST_LIMIT = 2;
export const DAILY_LIMIT = 5;

const GUEST_KEY = "vv_guest_messages";

// Fallback for browsers that block storage (private mode, embedded previews):
// the stamps live in memory for this session instead of breaking the tap.
let memoryGuest = [];

/** The moment the day a message belongs to began, on the device's own clock. */
export function dayStart(now = Date.now()) {
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  return from.getTime();
}

/** When the next day begins: the moment a used-up allowance is handed back in full. */
export function nextDayStart(now = Date.now()) {
  const next = new Date(dayStart(now));
  next.setDate(next.getDate() + 1);
  return next.getTime();
}

/** Only the messages used since the day began count — yesterday's have already come back. */
export function todayStamps(stamps, now = Date.now()) {
  const from = dayStart(now);
  return (Array.isArray(stamps) ? stamps : [])
    .filter((stamp) => Number.isFinite(stamp) && stamp >= from)
    .sort((a, b) => a - b);
}

/**
 * What the allowance looks like right now: the messages left today, and when the new
 * day begins. A new day sets the allowance back to its full number — the fresh
 * messages are never added on top of ones that were not used, so it never grows.
 */
export function creditsFrom(stamps, limit, now = Date.now()) {
  const used = todayStamps(stamps, now).length;
  return {
    remaining: Math.max(0, limit - used),
    nextReturnAt: nextDayStart(now),
  };
}

export function formatWait(ms) {
  const minutes = Math.max(0, Math.ceil(ms / 60000));
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

// —— guests: the same fresh-each-day allowance, kept on the device ——

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
  memoryGuest = [...todayStamps(getGuestStamps(), now), now];
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
    { user_email: email, used_at: { $gte: isoOf(dayStart(now)) } },
    { sort: "used_at", limit: 50, fields: ["used_at"] }
  );
  const stamps = (page?.items || []).map((record) => Date.parse(record.used_at));
  return todayStamps(stamps, now);
}

export async function spendCredit(email) {
  const usedAt = isoOf(Date.now());
  await base44.entities.UsageRecord.create({ user_email: email, used_at: usedAt });
  return Date.parse(usedAt);
}

/** Clears the days that are already over, so only today's messages are ever kept. */
export async function pruneUsage(email) {
  await base44.entities.UsageRecord.deleteMany({
    user_email: email,
    used_at: { $lt: isoOf(dayStart()) },
  });
  await base44.entities.UsageRecord.deleteMany({
    user_email: email,
    used_at: { $exists: false },
  });
}