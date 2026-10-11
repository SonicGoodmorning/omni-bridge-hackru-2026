"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "./session-provider";
import { SampleProfiles } from "./sample-profiles";
import { Icon } from "./icons";
import { LANGUAGES, type Locale } from "@/lib/types";
import type { PatientProfile } from "@/lib/patient/profile";

const options = {
  foodAccess: ["I can usually get the foods I need", "Money is tight", "Transport makes shopping difficult", "Food choices are limited where I live"],
  cooking: ["I cook most meals for my family", "I cook for myself", "We share the cooking", "Family or friends cook for me", "Mostly prepared or takeaway meals"],
  workSchedule: ["Regular daytime hours", "On my feet for long shifts", "Rotating shifts", "Working from home", "Studying", "Retired", "Not currently working"],
  activity: ["Mostly sitting outside work", "Walking most days", "Cycling and walking", "Regular exercise", "Limited mobility", "Varies day to day"],
};
const sections: { title: string; note: string; fields: { key: keyof PatientProfile; label: string; hint: string }[] }[] = [
  { title: "Health background", note: "Leave unknown details blank. Your profile never creates or changes a treatment plan.", fields: [
    { key: "conditions", label: "Other conditions", hint: "Existing conditions or relevant history, if known" },
    { key: "medications", label: "Current medicines & supplements", hint: "Names, doses and timing if known; do not guess" },
    { key: "allergies", label: "Allergies & reactions", hint: "Food or medicine and what reaction you experienced" },
    { key: "foodsToAvoid", label: "Foods to avoid", hint: "Restrictions, intolerances or foods not to use as examples" },
  ] },
  { title: "Communication & support", note: "Tell us what makes a conversation easier for you.", fields: [
    { key: "communicationNeeds", label: "Communication needs", hint: "Short sentences, larger text, hearing or vision needs" },
    { key: "culturalPreferences", label: "Helpful examples or topics to avoid", hint: "Analogies that help you, or sensitive topics" },
    { key: "dailyRoutine", label: "Daily routine", hint: "Meal patterns or scheduling constraints to discuss" },
    { key: "supportNeeds", label: "Support or access needs", hint: "Transport, getting medicines, family support" },
  ] },
];
export function PatientProfileWorkspace() {
  const session = useSession(); const patient = session.patient;
  const [draft, setDraft] = useState({ ...patient.profile });
  const [locale, setLocale] = useState<Locale>(session.locale);
  const [remember, setRemember] = useState(patient.remember);
  const [saved, setSaved] = useState(false); const [confirmClear, setConfirmClear] = useState(false);
  const [food, setFood] = useState(""); const [foodError, setFoodError] = useState("");
  useEffect(() => { setDraft({ ...patient.profile }); setRemember(patient.remember); }, [patient.profile, patient.remember]);
  useEffect(() => { setLocale(session.locale); }, [session.locale]);
  function update(key: keyof PatientProfile, value: string | boolean | number | null) { setDraft((current) => ({ ...current, [key]: value })); setSaved(false); }
  const foods = draft.familiarFoods.split(/[,;\n]/).map((value) => value.trim()).filter(Boolean);
  function addFood(value: string) {
    const items = value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
    const merged = [...foods]; for (const item of items) if (!merged.some((existing) => existing.toLowerCase() === item.toLowerCase())) merged.push(item);
    const next = merged.join(", "); if (next.length > 800) { setFoodError("Keep your food list under 800 characters."); return; }
    update("familiarFoods", next); setFood(""); setFoodError("");
  }
  function numeric(key: "age" | "heightCm" | "weightKg", label: string, min: number, max: number, step = 1) {
    return <label>{label}<input type="number" min={min} max={max} step={step} value={draft[key] ?? ""} onChange={(event) => { const value = event.target.value === "" ? null : event.target.valueAsNumber; update(key, value); if (key === "age") update("ageGroup", value === null ? "unspecified" : value < 13 ? "child" : value < 18 ? "teen" : value >= 65 ? "older-adult" : "adult"); }} /></label>;
  }
  function select(key: keyof typeof options, label: string) { return <label>{label}<select value={draft[key]} onChange={(event) => update(key, event.target.value)}><option value="">Choose, or leave blank</option>{options[key].map((value) => <option key={value}>{value}</option>)}</select></label>; }
  return <main className="care-workspace profile-workspace">
    <header className="care-heading"><div><p className="eyebrow">PATIENT PROFILE</p><h1>A little about you.</h1><p>Your language, familiar foods and everyday life.</p></div><Link href="/numbers" className="text-button">My numbers <Icon name="arrow" size={16} /></Link></header>
    <SampleProfiles current={draft.sampleId} onSelect={(profile) => { setDraft(profile); setRemember(Boolean(patient.savedProfiles[profile.recordId])); setLocale(profile.preferredLanguage); setFood(""); setFoodError(""); setSaved(false); setConfirmClear(false); }} />
    <p className="profile-intro">All details are optional. Use fictional details for this prototype. A sample loads into this form; save to apply it and open its fictional readings.</p>
    <form onSubmit={(event) => { event.preventDefault(); if (food.trim()) { addFood(food); return; } if (session.savePatientProfile(draft, remember, locale)) setSaved(true); }}>
      <section className="profile-section intake-section"><div><h2>About you</h2><p>Share only what helps with your care. Every detail is optional.</p></div><div className="profile-fields profile-demographics">
        <label>First name or nickname<input value={draft.preferredName} maxLength={200} autoComplete="off" onChange={(event) => update("preferredName", event.target.value)} /></label>
        {numeric("age", "Age", 0, 120)}
        <label>Sex<select value={draft.sex} onChange={(event) => update("sex", event.target.value)}><option value="unspecified">Prefer not to say</option><option value="female">Female</option><option value="male">Male</option><option value="intersex">Intersex</option><option value="self-described">Self-described</option></select></label>
        {numeric("heightCm", "Height (cm)", 30, 260, .1)}{numeric("weightKg", "Weight (kg)", 1, 500, .1)}
        <label>Preferred explanation language<select value={locale} onChange={(event) => { setLocale(event.target.value as Locale); setSaved(false); }}>{LANGUAGES.map((item) => <option key={item.locale} value={item.locale}>{item.nativeName}</option>)}</select></label>
        <label>Where you live<input value={draft.location} maxLength={200} placeholder="City or region" onChange={(event) => update("location", event.target.value)} /></label>
        {select("foodAccess", "Budget and food access")}{select("cooking", "Who cooks")}
        <label>Pronouns, if helpful<input value={draft.pronouns} maxLength={200} onChange={(event) => update("pronouns", event.target.value)} /></label>
      </div></section>
      <section className="profile-section"><div><h2>Food & everyday life</h2><p>Choose the foods and examples that are familiar to you.</p></div><div className="profile-fields">
        <div className="full-field"><label htmlFor="familiar-food-entry">Foods you eat most</label><div className="food-entry">{foods.map((item, i) => <button className="food-chip" type="button" key={`${item}-${i}`} aria-label={`Remove ${item}`} onClick={() => update("familiarFoods", foods.filter((_, index) => index !== i).join(", "))}>{item}<Icon name="close" size={14} /></button>)}<input id="familiar-food-entry" value={food} maxLength={200} placeholder="Type a food and press Enter" onChange={(event) => setFood(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addFood(food); } }} /><button type="button" className="text-button" onClick={() => addFood(food)} disabled={!food.trim()}>Add food</button></div><div className="food-suggestions">{["Rice", "Lentils", "Tortillas", "Congee", "Dumplings"].filter((item) => !foods.some((existing) => existing.toLowerCase() === item.toLowerCase())).map((item) => <button type="button" key={item} onClick={() => addFood(item)}>+ {item}</button>)}</div>{foodError && <p role="alert">{foodError}</p>}</div>
        {select("workSchedule", "Work and schedule")}{select("activity", "Activity")}
        <label className="full-field">Dietary preferences or fasting practices (optional)<input value={draft.dietaryPreferences} maxLength={800} placeholder="Any dietary requirements or fasting schedule you want respected" onChange={(event) => update("dietaryPreferences", event.target.value)} /></label>
      </div></section>
      {sections.map((group) => <section className="profile-section" key={group.title}><div><h2>{group.title}</h2><p>{group.note}</p></div><div className="profile-fields">{group.fields.map((field) => <label key={field.key}>{field.label}<textarea className="resize-none" rows={2} maxLength={800} value={String(draft[field.key])} onChange={(event) => update(field.key, event.target.value)} placeholder={field.hint} /></label>)}</div></section>)}
      <section className="profile-section"><div><h2>Your choices</h2><p>Your name, exact age, sex, height, weight, location and numbers stay in the browser.</p></div><div className="profile-choices">
        <label><input type="checkbox" checked={draft.useInAI} onChange={(event) => update("useInAI", event.target.checked)} /><span>Use my preferences and care needs in Gemini explanations<small>Sends your chosen food, lifestyle, health and support details to Gemini. Leave off to keep all profile details out of new requests.</small></span></label>
        <label><input type="checkbox" checked={draft.culturalExamples} onChange={(event) => update("culturalExamples", event.target.checked)} /><span>Use examples I choose<small>Requires AI context. Examples explain the original; they never replace prescribed foods or restrictions.</small></span></label>
        <label><input type="checkbox" checked={remember} onChange={(event) => { setRemember(event.target.checked); setSaved(false); }} /><span>Remember this profile in this browser<small>Saves this person’s edited details for future use. Other saved profiles are kept when you switch people. Unencrypted storage on this device, including snapshots in new visits. Numbers have a separate saving choice. Leave off on shared devices.</small></span></label>
      </div></section>
      <footer className="profile-save"><div><button className="primary-button" type="submit"><Icon name="check" size={18} />Save profile</button><span role="status" className={`profile-save-status${saved ? " is-saved" : patient.message.startsWith("Check profile") ? " is-error" : ""}`}>{saved && <Icon name="check" size={18} />}<span>{saved ? patient.message : "Save to apply changes. Switching people starts a fresh conversation. Previous saved conversations remain available."}{!saved && patient.message.startsWith("Check profile") ? ` ${patient.message}` : ""}</span></span></div><button className="text-button saved-danger" type="button" onClick={() => setConfirmClear(true)}>Clear profile</button></footer>
      {confirmClear && <div className="care-notice" role="alert"><p>Clear this profile and its saved browser copy? Saved visits, their patient snapshots and plans, and separately saved numbers remain. Delete visits in Visit history to remove their snapshots.</p><button className="text-button" type="button" onClick={() => { session.clearPatientProfile(); setRemember(false); setSaved(true); setConfirmClear(false); }}>Clear profile now</button><button type="button" className="text-button" onClick={() => setConfirmClear(false)}>Keep profile</button></div>}
    </form>
  </main>;
}
