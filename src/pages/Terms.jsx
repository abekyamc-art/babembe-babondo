import React from "react";
import LegalPage from "@/components/legal/LegalPage";
import { LEGAL_UPDATED, TERMS_SECTIONS } from "@/lib/legal";
import usePageMeta from "@/lib/pageMeta";

export default function Terms() {
  usePageMeta({
    title: "Terms of Use — Babembe Babondo GS",
    description:
      "The rules for using Babembe Babondo GS: your account, what you may post, coins and purchases, and live rooms.",
  });

  return <LegalPage title="Terms of Use" updated={LEGAL_UPDATED} sections={TERMS_SECTIONS} />;
}