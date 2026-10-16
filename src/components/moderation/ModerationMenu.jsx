import React, { useState } from "react";
import { Ban, Flag, MoreVertical, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import ReportSheet from "@/components/moderation/ReportSheet";
import { blockPerson, unblockPerson } from "@/lib/moderation";
import { cn } from "@/lib/utils";

/**
 * The one menu every piece of other people's content carries: report it, keep its owner out of your
 * way, or — on your own content — take it down. It is the same menu on a reel, a comment, a chat, a
 * profile and a live room, so a report is always reachable in the same place.
 */
export default function ModerationMenu({
  me,
  ownerEmail,
  ownerUsername,
  contentType,
  contentId,
  excerpt = "",
  isMine = false,
  blocked = false,
  tone = "dark",
  onDelete,
  onChanged,
}) {
  const { toast } = useToast();
  const [reporting, setReporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const username = ownerUsername || (ownerEmail || "").split("@")[0];
  const mine = isMine || (!!me?.email && ownerEmail === me.email);
  const canBlock = !mine && !!me?.email && !!ownerEmail;

  const toggleBlock = async () => {
    if (busy || !canBlock) return;
    setBusy(true);
    try {
      if (blocked) {
        await unblockPerson(me.email, ownerEmail);
        toast({ title: `Unblocked @${username}`, description: "You will see them again." });
      } else {
        await blockPerson(me.email, ownerEmail);
        toast({
          title: `Blocked @${username}`,
          description: "You will not see their reels, their messages or their profile.",
        });
      }
      onChanged?.(!blocked);
    } catch (error) {
      toast({ title: "That did not go through", description: "Please try again." });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setConfirming(false);
    try {
      await onDelete?.();
    } catch (error) {
      toast({ title: "That did not go through", description: "Please try again." });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="More"
            className={cn(
              "grid h-9 w-9 place-items-center rounded-full",
              tone === "dark"
                ? "bg-black/45 text-white"
                : "border border-border bg-card/80 text-foreground"
            )}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {mine ? (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setConfirming(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem onSelect={() => setReporting(true)}>
                <Flag className="mr-2 h-4 w-4" />
                Report
              </DropdownMenuItem>
              {canBlock ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled={busy} onSelect={toggleBlock}>
                    <Ban className="mr-2 h-4 w-4" />
                    {blocked ? `Unblock @${username}` : `Block @${username}`}
                  </DropdownMenuItem>
                </>
              ) : null}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ReportSheet
        open={reporting}
        onClose={() => setReporting(false)}
        target={{ contentType, contentId, ownerEmail, excerpt }}
        me={me}
        onDone={() =>
          toast({ title: "Report sent", description: "An admin will read it. Thank you." })
        }
      />

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Take this down?</AlertDialogTitle>
            <AlertDialogDescription>
              It comes off the app for everyone and cannot be brought back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}