import { base44 } from "@/api/base44Client";

export const WELCOME_COINS = 30;
export const BOOST_COST = 10;
export const BOOST_HOURS = 24;
export const MESSAGE_COST = 1;
export const MESSAGES_PER_COIN = 4;

export const COIN_PACKAGES = [
  { id: "starter", coins: 15, price: "$0.99" },
  { id: "popular", coins: 45, price: "$2.99" },
  { id: "bundle", coins: 100, price: "$6.99" },
];

export const GIFTS = [
  { id: "heart", name: "Heart", emoji: "❤️", coins: 3 },
  { id: "rose", name: "Rose", emoji: "🌹", coins: 5 },
  { id: "coffee", name: "Coffee", emoji: "☕", coins: 8 },
  { id: "crown", name: "Crown", emoji: "👑", coins: 20 },
  { id: "rocket", name: "Rocket", emoji: "🚀", coins: 50 },
];

export function balanceOf(profile) {
  return Number(profile?.coins) || 0;
}

/** Takes coins out of the wallet; returns null when there are not enough. */
export async function spendCoins(profile, amount) {
  if (!profile) return null;
  const balance = balanceOf(profile);
  if (balance < amount) return null;
  return base44.entities.Profile.update(profile.id, { coins: balance - amount });
}

/** Gift coins land on the host's balance. */
export async function creditCoins(email, amount) {
  const page = await base44.entities.Profile.filter({ user_email: email }, { limit: 1 });
  const host = page?.items?.[0];
  if (!host) return null;
  return base44.entities.Profile.update(host.id, { coins: balanceOf(host) + amount });
}

// —— a refill's four messages: the coin is only owed until the fourth is answered ——

const OWED_KEY = "vv_coin_owed";

function readOwed() {
  try {
    const all = JSON.parse(localStorage.getItem(OWED_KEY) || "{}");
    return all && typeof all === "object" ? all : {};
  } catch (err) {
    // storage unavailable — the count lives in memory for this session
    return {};
  }
}

/** How many of the messages a coin bought are still to be answered. */
export function owedMessages(email) {
  return Math.max(0, Number(readOwed()[email]) || 0);
}

export function writeOwedMessages(email, count) {
  if (!email) return;
  const all = readOwed();
  if (count > 0) all[email] = count;
  else delete all[email];
  try {
    localStorage.setItem(OWED_KEY, JSON.stringify(all));
  } catch (err) {
    // storage unavailable — the count lives in memory for this session
  }
}