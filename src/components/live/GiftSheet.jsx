import React from "react";
import { Coins } from "lucide-react";
import { GIFTS } from "@/lib/coins";
import LiveSheet from "@/components/live/LiveSheet";

/** The room's gift tray: pick one, the host's balance goes up. */
export default function GiftSheet({ open, coins, sending, onPick, onGetCoins, onClose }) {
  return (
    <LiveSheet open={open} title="Send a gift" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        {GIFTS.map((gift) => {
          const affordable = coins >= gift.coins;
          return (
            <button
              key={gift.id}
              type="button"
              disabled={sending || !affordable}
              onClick={() => onPick(gift)}
              className={`flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left ${
                affordable ? "" : "opacity-40"
              }`}
            >
              <span className="text-[12px] font-semibold">
                <span className="mr-1 text-[16px]">{gift.emoji}</span>
                {gift.name}
              </span>
              <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-accent">
                <Coins className="h-3 w-3" />
                {gift.coins}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-center text-[11px] text-white/50">
        {coins > 0 ? `You have ${coins} coins.` : "You need coins to send a gift."}
      </p>
      {coins < Math.min(...GIFTS.map((gift) => gift.coins)) ? (
        <button
          type="button"
          onClick={onGetCoins}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[13px] font-semibold text-accent-foreground"
        >
          <Coins className="h-4 w-4" />
          Get coins
        </button>
      ) : null}
    </LiveSheet>
  );
}