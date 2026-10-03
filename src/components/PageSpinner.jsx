import React from "react";

/** Shown in the moment a screen that arrives on demand is still on its way. */
export default function PageSpinner() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
    </div>
  );
}