import { emptyProfile, type PatientProfile } from "./profile";

// Authored fictional people, never assumptions derived from a person's language or background.
export const SAMPLE_PROFILES: PatientProfile[] = [
  { ...emptyProfile, recordId: "sample-aylin", sampleId: "aylin", preferredName: "Ege", age: 34, ageGroup: "adult", sex: "female", pronouns: "she/her", heightCm: 166, weightKg: 63, preferredLanguage: "tr-TR", location: "Delran", familiarFoods: "Lentil soup, Bulgur, Yogurt, Simit, Olives", foodAccess: "I can usually get the foods I need", cooking: "I cook for myself", workSchedule: "Regular daytime hours", activity: "Cycling and walking", dietaryPreferences: "Prefer plant-based meals", conditions: "No conditions entered", medications: "No medicines entered", communicationNeeds: "Written summaries are helpful", dailyRoutine: "Lunch around noon", useInAI: true, culturalExamples: true },
];
