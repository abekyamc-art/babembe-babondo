import React from "react";
import LegalPage from "@/components/legal/LegalPage";
import { LEGAL_UPDATED, PRIVACY_SECTIONS } from "@/lib/legal";
import usePageMeta from "@/lib/pageMeta";

export default function Privacy() {
  usePageMeta({
    title: "Privacy Policy — Babembe Babondo GS",
    description:
      "What Babembe Babondo GS collects, why it is collected, who can see it, and how to delete your account.",
  });

  return (
    <LegalPage title="Privacy Policy" updated={LEGAL_UPDATED} sections={PRIVACY_SECTIONS} />
  );
}