import type { ReviewFlag } from "../types";
import type { VisitRequest } from "./types";

const englishNumberWords: Record<string, string> = {
  zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
  eleven: "11", twelve: "12", thirteen: "13", fourteen: "14", fifteen: "15", sixteen: "16", seventeen: "17", eighteen: "18", nineteen: "19",
  twenty: "20", thirty: "30", forty: "40", fifty: "50", sixty: "60", seventy: "70", eighty: "80", ninety: "90",
};

function asciiDigits(text: string) {
  return text.normalize("NFKC").replace(/[٠-٩۰-۹०-९]/g, (digit) => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x0966 ? code - 0x0966 : code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}

function digitFacts(text: string) {
  return new Set([...asciiDigits(text).matchAll(/\d+(?:[.,]\d+)?/g)].map((match) => Number(match[0].replace(",", ".")).toString()));
}

function englishFacts(text: string) {
  const original = asciiDigits(text);
  // Recognize common written quantities up to ninety-nine. This deliberately
  // remains a limited review aid rather than a full natural-language parser.
  const compounds = original.toLowerCase().replace(
    /\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)[\s-]+(one|two|three|four|five|six|seven|eight|nine)\b/g,
    (_, tens: string, ones: string) => String(Number(englishNumberWords[tens]) + Number(englishNumberWords[ones])),
  );
  const normalized = compounds.replace(/\b[a-z]+\b/g, (word) => englishNumberWords[word] ?? word);
  const facts = new Set<string>();
  const units = "%|percent|millilit(?:er|re)s?|ml|milligrams?|mg|micrograms?|mcg|grams?|weeks?|days?|minutes?|hours?|(?:study\\s+)?visits?|tablets?|pills?";
  for (const match of normalized.matchAll(new RegExp(`\\b(\\d+(?:[.,]\\d+)?)(?:\\s*(${units}))?`, "gi"))) {
    // Grammar such as "one of the groups" is not a quantity unless digits or a unit occur.
    if (!match[2] && !new RegExp(`\\b${match[1]}\\b`).test(original)) continue;
    let unit = (match[2] ?? "").toLowerCase().replace(/study\s+/, "").replace(/s$/, "");
    if (unit === "percent") unit = "%";
    if (/^(?:ml|millilit)/.test(unit)) unit = "mL";
    if (/^(?:mg|milligram)/.test(unit)) unit = "mg";
    if (/^(?:mcg|microgram)/.test(unit)) unit = "mcg";
    facts.add(`${Number(match[1].replace(",", "."))}${unit ? ` ${unit}` : ""}`);
  }
  return facts;
}

function numericFlags(source: Set<string>, reverse: Set<string>): ReviewFlag[] {
  const missing = [...source].filter((fact) => !reverse.has(fact));
  const added = [...reverse].filter((fact) => !source.has(fact));
  return [
    ...(missing.length ? [{ code: "NUMERIC_FACT_MISSING", severity: "blocking" as const, message: `Review missing or changed numerical quantities in the reverse translation: ${missing.join(", ")}.` }] : []),
    ...(added.length ? [{ code: "NUMERIC_FACT_ADDED", severity: "blocking" as const, message: `Review added or changed numerical quantities in the reverse translation: ${added.join(", ")}.` }] : []),
  ];
}

export function reviewVisit(request: VisitRequest, translation: string, reverseTranslation: string): ReviewFlag[] {
  const englishSource = request.speaker === "clinician";
  const flags = numericFlags(
    englishSource ? englishFacts(request.text) : digitFacts(request.text),
    englishSource ? englishFacts(reverseTranslation) : digitFacts(reverseTranslation),
  );
  const negation = /\b(?:not|no|never|without|cannot|can't|don't|doesn't|won't|neither)\b/i;
  if (englishSource && negation.test(request.text) && !negation.test(reverseTranslation)) {
    flags.push({ code: "NEGATION_MISSING", severity: "blocking", message: "The original utterance contains a negation that may be missing from the English reverse translation." });
  }
  // These checks intentionally avoid claiming to understand native-language meaning.
  // Patient questions are translated as spoken, not compared to a trial document.
  const hasQuestionMark = /[?？]/.test(request.text);
  const englishRendering = englishSource ? reverseTranslation : translation;
  if (hasQuestionMark && !/[?？]/.test(englishRendering)) {
    flags.push({ code: "QUESTION_REVIEW", severity: "warning", message: "The source appears to ask a question. Check that the English rendering remains a question and does not answer it." });
  }
  flags.push({ code: "REVIEW_AID", severity: "info", message: "Reverse translation and quantity checks are review aids, not proof of accuracy. Review names, units, negations, questions, and meaning before sharing; native-language checks are limited to written digits." });
  return flags;
}
