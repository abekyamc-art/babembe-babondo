import { base44 } from "@/api/base44Client";

export const GUEST_LIMIT = 2;
export const DAILY_LIMIT = 5;

const GUEST_KEY = "vv_guest_messages";

export function todayKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function getGuestUsed() {
  const value = parseInt(localStorage.getItem(GUEST_KEY) || "0", 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function bumpGuestUsed() {
  const next = getGuestUsed() + 1;
  localStorage.setItem(GUEST_KEY, String(next));
  return next;
}

export async function getDailyUsed(email) {
  const page = await base44.entities.UsageRecord.filter(
    { user_email: email, date: todayKey() },
    { limit: 1 }
  );
  return page?.items?.[0]?.count || 0;
}

export async function bumpDailyUsed(email) {
  const date = todayKey();
  const page = await base44.entities.UsageRecord.filter(
    { user_email: email, date },
    { limit: 1 }
  );
  const existing = page?.items?.[0];

  if (existing) {
    const next = (existing.count || 0) + 1;
    await base44.entities.UsageRecord.update(existing.id, { count: next });
    return next;
  }

  await base44.entities.UsageRecord.create({ user_email: email, date, count: 1 });
  return 1;
}