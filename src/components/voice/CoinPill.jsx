import React from "react";
import { Coins } from "lucide-react";

/** The wallet's balance, drawn as a sibling of the messages pill. */
export default function CoinPill({ coins, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Wallet: ${coins} coins`}
      className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card/70 px-3 py-1.5 text-[11px] font-medium text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
    >
      <Coins className="h-3.5 w-3.5 text-accent" />
      {coins}
    </button>
  );
}