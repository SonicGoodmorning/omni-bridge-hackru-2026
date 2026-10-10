import type { ReviewFlag } from "../types";
import { reviewVisit } from "../visits/review";
import type { DocumentBlock, DocumentRequest, DocumentSource } from "./types";

function digits(text: string) {
  const normalized = text.normalize("NFKC").replace(/[٠-٩۰-۹०-९]/g, (digit) => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x0966 ? code - 0x0966 : code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
  return new Set([...normalized.matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => String(Number(m[0].replace(",", ".")))));
}

export function reviewDocument(request: DocumentRequest, source: DocumentSource, blocks: DocumentBlock[]): ReviewFlag[] {
  const flags: ReviewFlag[] = [];
  for (const paragraph of source.paragraphs) {
    const block = blocks.find((entry) => entry.id === paragraph.id)!;
    flags.push(...reviewVisit({ requestId: request.requestId, locale: request.locale, engine: request.engine, speaker: "clinician", text: paragraph.text }, block.translation, block.backTranslation)
      .filter((flag) => flag.code !== "REVIEW_AID")
      .map((flag) => ({ ...flag, sourceSnippet: paragraph.text })));
    const sourceDigits = digits(paragraph.text);
    const targetDigits = digits(block.translation);
    if ([...sourceDigits].some((n) => !targetDigits.has(n)) || [...targetDigits].some((n) => !sourceDigits.has(n))) {
      flags.push({ code: "TARGET_NUMBER_CHANGE", severity: "blocking", message: "A written number is missing or changed in the translated explanation. Compare it with the source paragraph.", sourceSnippet: paragraph.text });
    }
    const protectedRendering = block.backTranslation.toLowerCase().normalize("NFKC")
      .replace(/\bmillimet(?:er|re)s?\s+of\s+mercury\b/g, "mmhg")
      .replace(/\bmm\s+hg\b/g, "mmhg");
    for (const term of ["mmHg", "lisinopril"]) {
      if (paragraph.text.toLowerCase().includes(term.toLowerCase()) && !protectedRendering.includes(term.toLowerCase())) {
        flags.push({ code: "PROTECTED_TERM_MISSING", severity: "blocking", message: `The English reverse rendering is missing the protected source term ${term}.`, sourceSnippet: paragraph.text });
      }
    }
    // Narrow, explicit regression guards supplement human review. These are not
    // a general entailment test or a guarantee that all unsupported claims are found.
    const additions = [
      /\b(?:goal|target)\b/i,
      /\b(?:causes?|caused by|symptom of|sign of)\b/i,
      /\b(?:call 911|emergency number|seek emergency|get help right away)\b/i,
    ];
    if (additions.some((pattern) => pattern.test(block.backTranslation) && !pattern.test(paragraph.text))) {
      flags.push({ code: "UNSUPPORTED_CLINICAL_ADDITION", severity: "blocking", message: "The explanation may add a target, symptom explanation, or urgent instruction absent from the source. Revise before sharing.", sourceSnippet: paragraph.text });
    }
    const negation = /\b(?:not|no|never|without|cannot|can't|don't|doesn't|won't|neither)\b/gi;
    const originalNegations = [...paragraph.text.matchAll(negation)].length;
    const reversedNegations = [...block.backTranslation.matchAll(negation)].length;
    if (originalNegations > reversedNegations && !flags.some((flag) => flag.code === "NEGATION_MISSING" && flag.sourceSnippet === paragraph.text)) {
      flags.push({ code: "NEGATION_REVIEW", severity: "warning", message: "The English reverse rendering contains fewer negations than the source. Review their meaning before sharing.", sourceSnippet: paragraph.text });
    }
  }
  flags.push({ code: "REVIEW_AID", severity: "info", message: "Source links, reverse rendering, and numerical checks are review aids, not proof of accuracy. Check that each cited paragraph supports its explanation and preserves attribution, quantities, units, and negations." });
  return flags;
}
