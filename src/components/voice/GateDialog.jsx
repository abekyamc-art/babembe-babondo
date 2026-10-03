import React from "react";
import { Loader2, Moon, Sun } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import GoogleIcon from "@/components/GoogleIcon";

export default function GateDialog({
  open,
  variant,
  used,
  limit,
  signedIn,
  busy,
  message,
  onGoogle,
  onSignOut,
  onOpenChange,
}) {
  const offerGoogle = variant === "signin" || (variant === "account" && !signedIn);

  const title =
    variant === "signin"
      ? "Keep talking"
      : variant === "daily"
        ? "That's all for today"
        : "Your voice assistant";

  const description =
    variant === "signin"
      ? "You've used your free messages. Sign in with Google to keep going — you get 5 every day."
      : variant === "daily"
        ? "You've used all 5 messages for today. Your limit resets tomorrow, and credits are coming soon."
        : signedIn
          ? `You've used ${used} of ${limit} today. Your limit resets every day.`
          : "You get 2 free messages. Sign in with Google for 5 every day.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <div className="mb-2 grid h-11 w-11 place-items-center rounded-full bg-secondary">
            {variant === "daily" ? (
              <Moon className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Sun className="h-5 w-5 text-accent" />
            )}
          </div>
          <DialogTitle className="font-display text-2xl font-normal tracking-tight">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[14px] leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>

        {message ? <p className="text-[13px] text-destructive">{message}</p> : null}

        <DialogFooter className="mt-2 flex-col gap-2 sm:flex-col">
          {offerGoogle ? (
            <>
              <Button onClick={onGoogle} disabled={busy} className="w-full gap-2" size="lg">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon className="h-4 w-4" />}
                Continue with Google
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
                Not now
              </Button>
            </>
          ) : null}

          {variant === "account" && signedIn ? (
            <>
              <Button variant="secondary" className="w-full" onClick={onSignOut}>
                Sign out
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </>
          ) : null}

          {variant === "daily" ? (
            <Button variant="secondary" className="w-full" onClick={() => onOpenChange(false)}>
              Got it
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}