import React from "react";
import LifeExamShell from "./LifeExamShell";

/** The daily-life examination, level by level, over the call screen — which it never touches. */
export default function LifeExamSheet({ open, onClose }) {
  return <LifeExamShell open={open} onClose={onClose} />;
}