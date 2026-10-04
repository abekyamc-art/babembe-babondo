/** The steps one tap of Generate goes through, in the order the studio shows them. */
export const RAP_STEPS = [
  { id: "words", label: "Maneno yanapangwa" },
  { id: "angle", label: "Wazo limechaguliwa" },
  { id: "bars", label: "Mistari inaandikwa" },
  { id: "check", label: "Maneno yanachunguzwa" },
  { id: "voice", label: "Sauti inaimbwa" },
  { id: "keep", label: "Take inahifadhiwa" },
];

/** The steps as a run begins: every one of them laid out, none of them done yet. */
export function freshSteps() {
  return RAP_STEPS.map((step) => ({ ...step, state: "pending" }));
}

/** How long a run has been working, as m:ss. */
export function secondsLabel(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(whole / 60);
  return `${mins}:${String(whole % 60).padStart(2, "0")}`;
}