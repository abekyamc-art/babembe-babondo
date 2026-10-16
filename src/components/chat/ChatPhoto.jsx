import React, { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Image } from "@/components/ui/image";
import { photoUrl } from "@/lib/chat";

/**
 * A photo in a thread: opened through a short-lived private link, or, while it is still on its way
 * up, shown straight from the phone itself.
 */
export default function ChatPhoto({ fileUri, localUrl }) {
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (localUrl) {
      setUrl(localUrl);
      return undefined;
    }
    let alive = true;
    photoUrl(fileUri)
      .then((next) => {
        if (alive) setUrl(next);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [fileUri, localUrl]);

  if (!url) {
    return (
      <div className="grid h-44 w-44 place-items-center rounded-2xl bg-secondary">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open photo"
        className="block overflow-hidden rounded-2xl"
      >
        <Image src={url} alt="Photo" className="h-44 w-44" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close photo"
            className="absolute right-4 top-[max(0.75rem,env(safe-area-inset-top))] grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white"
          >
            <X className="h-5 w-5" />
          </button>
          <Image src={url} alt="Photo" className="max-h-[80dvh] w-full" fittingType="fit" />
        </div>
      ) : null}
    </>
  );
}