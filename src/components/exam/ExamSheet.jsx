import React from "react";
import ExamShell from "./ExamShell";
import { loadExam, saveExam, startExam } from "@/lib/examSession";

/**
 * The medical examination, as it has always stood: the shared shell is handed its own words and its own
 * store, so nothing of it changes now that a second examination is taken beside it.
 */
const MEDICAL_EXAM = {
  title: "GLOIRE AI",
  subtitle: "Kibembe Medical Examination",
  system: "Kibembe Learning & Examination System",
  credit: "Created by Gloire Sadiki Asende.",
  ariaLabel: "GLOIRE AI Kibembe medical examination",
  closeLabel: "Close the examination",
  footer: "Pass mark 80% · confirmed vocabulary only",
  load: loadExam,
  start: startExam,
  save: saveExam,
};

export default function ExamSheet({ open, onClose }) {
  return <ExamShell open={open} onClose={onClose} exam={MEDICAL_EXAM} />;
}