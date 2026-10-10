import React from "react";
import ToolCallRow from "@/components/agents/ToolCallRow";

/** Everything the companion did for one answer, one under the other. */
export default function ToolCallList({ calls = [] }) {
  if (!calls?.length) return null;
  return (
    <div className="mt-2 space-y-1.5">
      {calls.map((call, index) => (
        <ToolCallRow key={call.id || index} call={call} />
      ))}
    </div>
  );
}