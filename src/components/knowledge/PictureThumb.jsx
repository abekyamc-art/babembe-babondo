import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";

/**
 * One picture of the admin's knowledge, standing in the panel.
 *
 * It is kept in the app's own private storage, so it is shown through a short-lived link made for
 * this opening alone — never at a public address. Until that link arrives the box keeps the room the
 * picture will take, so nothing on the panel jumps when it lands.
 */
export default function PictureThumb({ picture, className = "h-12 w-12" }) {
  const [url, setUrl] = useState("");
  const uri = picture?.file_uri || "";

  useEffect(() => {
    let alive = true;
    setUrl("");
    if (!uri) return undefined;
    base44.integrations.Core.CreateFileSignedUrl({ file_uri: uri, expires_in: 900 })
      .then((res) => {
        if (alive) setUrl(res?.signed_url || "");
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [uri]);

  if (!url) {
    return <span aria-hidden className={`inline-block shrink-0 rounded-lg border border-border bg-muted ${className}`} />;
  }

  return (
    <Image
      src={url}
      alt={picture?.name || "A picture of the knowledge"}
      fittingType="fill"
      className={`shrink-0 rounded-lg border border-border object-cover ${className}`}
    />
  );
}