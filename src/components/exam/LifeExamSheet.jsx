import React from "react";
import ExamShell from "./ExamShell";
import { loadExam, saveExam, startExam } from "@/lib/lifeExamSession";

/**
 * The daily-life examination: greetings and introductions, home and family, and everyday errands. It is
 * taken through the same shell as the medical examination and keeps its own answers in its own store.
 */
const LIFE_EXAM = {
  title: "GLOIRE AI",
  subtitle: "Kibembe Daily Life Examination",
  system: "Kibembe Learning & Examination System",
  credit: "Created by Gloire Sadiki Asende.",
  ariaLabel: "GLOIRE AI Kibembe daily life examination",
  closeLabel: "Close the daily life examination",
  footer: "Pass mark 80% · greetings, home and errands",
  load: loadExam,
  start: startExam,
  save: saveExam,
};

export default function LifeExamSheet({ open, onClose }) {
  return <ExamShell open={open} onClose={onClose} exam={LIFE_EXAM} />;
}