import type { ReviewFlag } from "../types";

const numberWords: Record<string, string> = {
  zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9",
  ten: "10", eleven: "11", twelve: "12", thirteen: "13", fourteen: "14", fifteen: "15", sixteen: "16", seventeen: "17", eighteen: "18", nineteen: "19",
  twenty: "20", thirty: "30", forty: "40", fifty: "50", sixty: "60", seventy: "70", eighty: "80", ninety: "90",
};

const unitPattern = "%|percent|millilit(?:er|re)s?|ml|weeks?|days?|minutes?|hours?|(?:study\\s+)?visits?|mg|mcg|grams?|tablets?|pills?";

function canonicalUnit(unit: string) {
  const value = unit.toLowerCase().replace(/study\s+/g, "");
  if (value === "%" || value === "percent") return "%";
  if (/^(ml|millilit)/.test(value)) return "mL";
  return value.replace(/s$/, "");
}

function numericFacts(text: string) {
  const normalized = text.toLowerCase().replace(/\b(?:[a-z]+)\b/g, (word) => numberWords[word] ?? word);
  const values = new Set<string>();
  const pattern = new RegExp(`\\b(\\d+(?:\\.\\d+)?)(?:\\s*(${unitPattern}))?`, "gi");
  for (const match of normalized.matchAll(pattern)) {
    // One/two introduced by grammar ("one of the groups") are not numeric claims.
    const value = Number(match[1]).toString();
    if (!match[2] && !new RegExp(`\\b${match[1]}\\b`).test(text)) continue;
    values.add(value + (match[2] ? ` ${canonicalUnit(match[2])}` : ""));
  }
  return values;
}

interface ProtectedConcept {
  code: string;
  source: RegExp;
  rendered: RegExp;
  message: string;
}

const protectedConcepts: ProtectedConcept[] = [
  { code: "PLACEBO_MISSING", source: /\bplacebo\b/i, rendered: /\bplacebo\b|dummy (?:pill|tablet)|inactive (?:pill|tablet)/i, message: "Check that the placebo is still explicitly explained." },
  { code: "INACTIVE_DRUG_MISSING", source: /(?:no|without) active (?:study )?drug/i, rendered: /(?:no|without|not contain).{0,35}(?:active|medicine|drug)|inactive (?:pill|tablet|drug)/i, message: "The English rendering may omit that the placebo has no active study drug." },
  { code: "NO_BENEFIT_GUARANTEE_MISSING", source: /(?:not guaranteed|does not guarantee|no guaranteed|cannot promise).{0,45}(?:help|benefit|work)|(?:help|benefit).{0,20}(?:not guaranteed)/i, rendered: /(?:not|no|never|cannot|can't|doesn't|don't).{0,45}(?:guarantee|promise|certain)|(?:may|might).{0,10}not.{0,15}(?:help|benefit|work)/i, message: "Check that a health benefit is still not guaranteed." },
  { code: "UNPROVEN_EFFECT_MISSING", source: /not been shown to work/i, rendered: /not.{0,25}(?:shown|proven|know).{0,30}(?:work|effective)|(?:do not|don't).{0,10}know.{0,20}(?:work|help)|unproven/i, message: "The source says the investigational tablet has not been shown to work." },
  { code: "RESEARCH_CARE_DISTINCTION_MISSING", source: /research is different from regular medical care/i, rendered: /research.{0,40}(?:different|not the same|not regular|not usual)|(?:different|not the same).{0,25}(?:medical care|health care)/i, message: "Check that research remains distinct from regular medical care." },
  { code: "RANDOM_ASSIGNMENT_MISSING", source: /assign you by chance/i, rendered: /(?:by chance|random|lottery|coin toss)/i, message: "The English rendering may omit that group assignment is by chance." },
  { code: "GROUP_CHOICE_MISSING", source: /neither you nor the researcher chooses/i, rendered: /neither.{0,40}(?:choos|decid)|(?:you|participant).{0,30}(?:cannot|can't|do not|don't).{0,20}(?:choos|decid)|nobody.{0,20}(?:choos|decid)/i, message: "Check that neither the participant nor researcher chooses the group." },
  { code: "UNKNOWN_RISKS_MISSING", source: /risks are not yet known/i, rendered: /(?:unknown|not.{0,12}known).{0,20}(?:risk|effect)|risk.{0,30}(?:unknown|not.{0,12}known|do not know|don't know)/i, message: "The English rendering may omit that some risks are unknown." },
  { code: "VOLUNTARY_RIGHT_MISSING", source: /\bvoluntary\b/i, rendered: /voluntar|your (?:choice|decision)|you (?:can|may) (?:decide|choose)|up to you|not (?:required|mandatory)/i, message: "Check that participation is explicitly voluntary." },
  { code: "REFUSAL_RIGHT_MISSING", source: /may choose not to join/i, rendered: /(?:may|can).{0,20}(?:not (?:join|participate)|decline|refuse)|choose not|decide not/i, message: "The English rendering may omit the right to choose not to join." },
  { code: "WITHDRAWAL_RIGHT_MISSING", source: /stop participating at any time/i, rendered: /(?:stop|leave|withdraw|quit).{0,40}(?:any time|anytime|whenever)/i, message: "Check that the participant may stop at any time." },
  { code: "NO_PENALTY_MISSING", source: /without penalty/i, rendered: /(?:without|no|not).{0,15}(?:penalt|punish)|won't.{0,15}(?:penali|punish)/i, message: "The English rendering may omit withdrawal without penalty." },
  { code: "BENEFITS_PROTECTION_MISSING", source: /(?:loss of benefits|benefits to which you are entitled)/i, rendered: /(?:without|no|not|unaffected|keep|retain|won't).{0,55}(?:benefit)|benefit.{0,35}(?:unaffected|not affect|not lost|protected|keep)/i, message: "Check that entitled benefits remain protected." },
  { code: "CARE_PROTECTION_MISSING", source: /(?:not affect your regular care|will not affect your regular care)/i, rendered: /(?:not|won't|doesn't|no).{0,45}(?:affect|change|impact).{0,30}(?:care|treatment)|(?:care|treatment).{0,35}(?:unaffected|not affect|not change|same|continue)/i, message: "The English rendering may omit that regular care is unaffected." },
  { code: "UNSPECIFIED_DATA_POLICY_MISSING", source: /does not specify that policy/i, rendered: /(?:not|doesn't|no).{0,20}(?:specif|state|explain|describe|say)|(?:policy|rule|what happens).{0,25}(?:unspecified|not given|unknown)/i, message: "Check that the collected-data policy remains unspecified instead of invented." },
  { code: "NO_CONSENT_ACTION_MISSING", source: /does not ask you to sign or give consent/i, rendered: /(?:not|doesn't|no).{0,30}(?:sign|consent)/i, message: "Check that this education tool does not ask for a signature or consent." },
];

function hasNegation(text: string) {
  return /\b(?:not|no|never|without|cannot|can't|don't|doesn't|won't|neither|inactive|unproven|unknown)\b/i.test(text);
}

function contradictionFlags(text: string, sourceSnippet: string): ReviewFlag[] {
  const flags: ReviewFlag[] = [];
  // Scope negation to a clause: "no penalty; the tablet will cure you" still
  // contains an affirmative cure claim, while "not required to join" is a right.
  const sentences = text.split(/(?<=[.!?;:])\s+|\b(?:but|however|although|yet)\b/i);
  const positiveGuarantee = sentences.some((sentence) => !hasNegation(sentence) && /(?:guarantee|certain|definitely|100\s*%).{0,45}(?:help|benefit|cure|work)|(?:will|always).{0,15}cure/i.test(sentence));
  const groupChance = sentences.some((sentence) => !hasNegation(sentence)
    && [...sentence.matchAll(/\b(\d+(?:\.\d+)?)\s*(?:%|percent).{0,30}(?:chance|group)|(?:chance|group).{0,30}?(\d+(?:\.\d+)?)\s*(?:%|percent)/gi)]
      .some((match) => Number(match[1] ?? match[2]) !== 50));
  const participationText = text.replace(/\b(?:not|never)\s+(?:(?:be|been|being)\s+)?required\s+to/gi, "optional to");
  const forcedParticipation = /\b(?:must|required to)\s+(?:join|participate)|\b(?:cannot|can't|may not)\s+(?:leave|withdraw|stop participating)/i.test(participationText);
  const groupChoice = sentences.some((sentence) => !hasNegation(sentence) && /(?:you|researcher|doctor).{0,15}(?:can|will|may)\s+choose.{0,25}group/i.test(sentence));
  const activePlacebo = sentences.some((sentence) => !hasNegation(sentence) && /placebo.{0,40}(?:contains|has|includes).{0,15}(?:active (?:study )?drug|medicine)/i.test(sentence));
  if (positiveGuarantee || groupChance || forcedParticipation || groupChoice || activePlacebo) {
    flags.push({ code: "SOURCE_CONTRADICTION", severity: "blocking", message: "A claim appears to contradict the fixed fictional study. Resolve it with the source before releasing.", sourceSnippet: sourceSnippet.slice(0, 600) });
  }
  return flags;
}

// Deterministic English checks are deliberately conservative review aids.
// They cannot certify the target-language text or replace a qualified reviewer.
export function reviewFacts(sourceText: string, backTranslation: string): ReviewFlag[] {
  const flags: ReviewFlag[] = [];
  const sourceNumbers = numericFacts(sourceText);
  const renderedNumbers = numericFacts(backTranslation);
  const missing = [...sourceNumbers].filter((value) => !renderedNumbers.has(value));
  const extra = [...renderedNumbers].filter((value) => !sourceNumbers.has(value));
  if (missing.length) flags.push({ code: "NUMERIC_FACT_MISSING", severity: "blocking", message: `Check missing or changed numbers/units: ${missing.join(", ")}.` });
  if (extra.length) flags.push({ code: "NUMERIC_FACT_ADDED", severity: "blocking", message: `Check added or changed numbers/units: ${extra.join(", ")}.` });
  for (const concept of protectedConcepts) {
    if (concept.source.test(sourceText) && !concept.rendered.test(backTranslation)) {
      flags.push({ code: concept.code, severity: "blocking", message: concept.message });
    }
  }
  if (hasNegation(sourceText) && !hasNegation(backTranslation)) {
    flags.push({ code: "NEGATION_MISSING", severity: "blocking", message: "The source contains a negation or uncertainty that may be missing from the English rendering." });
  }
  flags.push(...contradictionFlags(sourceText, sourceText), ...contradictionFlags(backTranslation, backTranslation));
  if (/\b(?:voluntary|withdraw|without penalty|stop participating|choose not to join)\b/i.test(sourceText)) {
    flags.push({ code: "RIGHTS_REVIEW", severity: "info", message: "Review the participant's choice, withdrawal rights, and protection of care and benefits against the source." });
  }
  if (/\b(?:dose|dosage|prescrib|diagnos|cure|milligrams?|mg|mcg)\b/i.test(sourceText)) {
    flags.push({ code: "OUT_OF_SOURCE", severity: "warning", message: "This fictional study does not establish personal treatment, dose, or diagnosis information. Ask the study team to clarify." });
  }
  return flags.filter((flag, index, all) => all.findIndex((item) => item.code === flag.code) === index);
}
