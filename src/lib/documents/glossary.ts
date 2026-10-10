export interface GlossaryEntry { id: string; term: string; meaning: string; provenance: string }
export const GLOSSARY: GlossaryEntry[] = [
  { id: "placebo", term: "placebo", meaning: "A study comparison treatment that contains no active study drug. Check the source for what the specific study uses.", provenance: "Prepared glossary for fictional examples · research terms" },
  { id: "investigational-tablet", term: "investigational tablet", meaning: "A tablet being studied by researchers. The term alone does not say whether it works.", provenance: "Prepared glossary for fictional examples · research terms" },
  { id: "voluntary", term: "voluntary", meaning: "Optional: a person can choose whether to take part. Check the source for the specific rights and choices described.", provenance: "Prepared glossary for fictional examples · participation terms" },
  { id: "without-penalty", term: "without penalty", meaning: "Without a punishment. Check the source for exactly which consequences or benefits it discusses.", provenance: "Prepared glossary for fictional examples · participation terms" },
  { id: "hypertension", term: "hypertension", meaning: "The term for high blood pressure. This word definition does not diagnose anyone or explain a particular measurement.", provenance: "Prepared glossary for fictional examples · clinical vocabulary" },
  { id: "mmhg", term: "mmHg", meaning: "Millimetres of mercury: a unit used to express pressure.", provenance: "Prepared glossary for fictional examples · measurement units" },
  { id: "lisinopril", term: "lisinopril", meaning: "A medicine name. The word definition does not recommend taking it or specify a dose.", provenance: "Prepared glossary for fictional examples · medicine names" },
  { id: "mg", term: "mg", meaning: "Milligrams: a unit of mass. The amount must come from the source document.", provenance: "Prepared glossary for fictional examples · measurement units" },
  { id: "follow-up", term: "follow-up", meaning: "A later appointment or check. Its timing must come from the source document.", provenance: "Prepared glossary for fictional examples · appointment terms" },
];
