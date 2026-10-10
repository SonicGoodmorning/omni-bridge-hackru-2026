import type { DocumentInput, DocumentSource } from "./types";

export const VISIT_DOCUMENT: DocumentSource = {
  id: "visit-summary", revision: "DEMO-1_0", title: "Fictional visit summary", provenance: "fictional-fixture",
  paragraphs: [
    { id: "visit-header", title: "About this example", text: "Fictional outpatient follow-up summary. This is a demonstration, not a real record." },
    { id: "visit-assessment", title: "What the note records", text: "The fictional note records hypertension without symptoms. The recorded blood pressure is 148/94 mmHg." },
    { id: "visit-plan", title: "The documented plan", text: "The fictional clinician’s documented plan lists lisinopril 10 mg daily. The note says not to stop it without contacting the clinic. It lists a blood test in 2 weeks and a follow-up visit in 4 weeks." },
  ],
};

// Revisions identify edits; they are not security hashes. Exact paragraph matching
// also occurs before accepting a result, so a hash collision cannot approve it.
function revision(text: string) {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return `paste-${(value >>> 0).toString(16).padStart(8, "0")}-${text.length}`;
}

export function resolveDocumentSource(source: DocumentInput): DocumentSource {
  if (source.kind === "fixture") return { ...VISIT_DOCUMENT, paragraphs: VISIT_DOCUMENT.paragraphs.map((p) => ({ ...p })) };
  const text = source.text.trim();
  const sections = text.split(/\r?\n\s*\r?\n/).map((p) => p.trim()).filter(Boolean);
  // Bound generation size without dropping any supplied content.
  const paragraphs = sections.length > 20 ? [...sections.slice(0, 19), sections.slice(19).join("\n\n")] : sections;
  return {
    id: "synthetic-paste", revision: revision(text), title: "Pasted synthetic document", provenance: "synthetic-paste",
    paragraphs: paragraphs.map((paragraph, i) => ({ id: `paste-p${String(i + 1).padStart(2, "0")}`, title: `Paragraph ${i + 1}`, text: paragraph })),
  };
}
