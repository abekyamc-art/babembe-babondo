import { base44 } from "@/api/base44Client";

export const WELCOME_COINS = 5;
export const BOOST_COST = 10;
export const BOOST_HOURS = 24;
// every answer past the free daily questions takes one coin, and the coin is gone
export const MESSAGE_COST = 1;

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