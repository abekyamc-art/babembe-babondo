import React, { useEffect, useRef } from "react";
import useStream from "@/hooks/useStream";

/** Plays one other phone's sound — a guest's voice, heard by everyone in the room. */
export default function RemoteAudio({ stream }) {
  const nodeRef = useRef(null);
  useStream(nodeRef, stream);

  useEffect(
    () => () => {
      const node = nodeRef.current;
      if (node) node.srcObject = null;
    },
    []
  );

  return <audio ref={nodeRef} autoPlay playsInline className="hidden" />;
}