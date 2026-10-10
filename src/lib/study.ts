import type { StudySection } from "./types";

export const STUDY = {
  name: "The CLEAR Study",
  subtitle: "A fictional study for understanding clinical research",
  code: "CLEAR-026",
  version: "DEMO-1.0",
  date: "October 10, 2026",
};

export const SECTIONS: StudySection[] = [
  {
    id: "purpose", number: "01", title: "Purpose of the study", shortTitle: "Study purpose",
    body: "The CLEAR Study is a fictional research study comparing an investigational tablet with a placebo. A placebo looks like the investigational tablet but contains no active study drug. The investigational tablet has not been shown to work. Research is different from regular medical care, and taking part does not guarantee a health benefit.",
    keyFacts: ["Fictional study", "Investigational tablet versus placebo", "No guaranteed health benefit"], visual: "DOCUMENT",
  },
  {
    id: "randomization", number: "02", title: "How your study group is chosen", shortTitle: "Group assignment",
    body: "If you join, a computer will assign you by chance to the investigational-tablet group or the placebo group. You have a 50% chance of being assigned to either group. Neither you nor the researcher chooses your group. You may receive a placebo, which contains no active study drug. The investigational tablet is not guaranteed to help you.",
    keyFacts: ["50% chance of either group", "Neither participant nor researcher chooses", "Placebo has no active study drug", "No guaranteed benefit"], visual: "RANDOMIZATION",
  },
  {
    id: "procedures", number: "03", title: "Visits and study procedures", shortTitle: "Visits & procedures",
    body: "Participation involves 4 study visits over 8 weeks. Each visit lasts approximately 60 minutes. At each visit, the research team will ask questions about your experience. At the first and final visits, the team will collect a 5 mL blood sample. These are fictional study procedures, not instructions for your medical care.",
    keyFacts: ["4 study visits", "8 weeks", "Approximately 60 minutes per visit", "5 mL at first and final visits"], visual: "CALENDAR",
  },
  {
    id: "risks", number: "04", title: "Possible risks and uncertainties", shortTitle: "Risks & uncertainties",
    body: "The investigational tablet may cause nausea, headache, or other side effects. Some risks are not yet known. A blood draw may cause brief discomfort or bruising. The research team cannot promise that you will have no side effects. Speak with the study team about questions or concerns; this document does not provide personal medical advice.",
    keyFacts: ["Possible nausea or headache", "Some risks are unknown", "Blood draw may cause discomfort or bruising", "No promise of no side effects"], visual: "DOCUMENT",
  },
  {
    id: "voluntary", number: "05", title: "Your choice to participate", shortTitle: "Your choice",
    body: "Joining this study is voluntary. You may choose not to join. Your decision will not affect your regular care or benefits to which you are entitled. You may ask questions and take time to discuss the study with people you trust. This education tool does not ask you to sign or give consent.",
    keyFacts: ["Participation is voluntary", "You may choose not to join", "Regular care and entitled benefits are unaffected"], visual: "DOCUMENT",
  },
  {
    id: "withdrawal", number: "06", title: "Leaving the study", shortTitle: "Leaving the study",
    body: "You may stop participating at any time without penalty or loss of benefits to which you are entitled. Tell the study team if you want to leave so they can discuss any final study procedures with you. Leaving will not affect your regular care. Ask the study team what happens to information already collected; this fictional document does not specify that policy.",
    keyFacts: ["You may stop at any time", "No penalty or loss of entitled benefits", "Regular care is unaffected", "Collected-data policy is not specified"], visual: "DOCUMENT",
  },
];

export const SAMPLE_CONVERSATION = "You have a 50% chance of being assigned to either group. Neither you nor the researcher chooses the group. You may receive a placebo, which has no active study drug.";

export function findSection(id: string) {
  return SECTIONS.find((section) => section.id === id);
}
