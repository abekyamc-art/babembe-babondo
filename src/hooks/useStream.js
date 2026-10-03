import { useEffect } from "react";

/** Hands a live stream to a video or audio element, however the stream arrived. */
export default function useStream(nodeRef, stream) {
  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    node.srcObject = stream || null;
    if (stream) node.play?.().catch(() => {});
  }, [nodeRef, stream]);
}