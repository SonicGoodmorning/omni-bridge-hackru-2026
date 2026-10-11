"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { emptyProfile, patientProfileSchema, type PatientProfile } from "@/lib/patient/profile";
import { SAMPLE_PROFILES } from "@/lib/patient/samples";

const STORAGE_KEY = "omni-bridge-patient-profile-v1";
const LIBRARY_KEY = "omni-bridge-patient-profiles-v1";
const REMOVED_SAMPLE_ID = "sample-priya";
const librarySchema = z.object({
  version: z.literal(1), activeId: z.string().min(1).max(100).nullable(),
  profiles: z.record(z.string().min(1).max(100), patientProfileSchema),
}).strict().refine((value) => Object.keys(value.profiles).length <= 50 && Object.entries(value.profiles).every(([key, profile]) => key === profile.recordId) && (value.activeId === null || Object.hasOwn(value.profiles, value.activeId)), "Invalid saved profile library");

function renameOriginalSample(profile: PatientProfile): PatientProfile {
  // Keep stable IDs so existing readings remain associated with the same person.
  const original = profile.recordId === "sample-aylin" ? { name: "Aylin", next: "Ege", location: "Brooklyn, New York" } : null;
  return original ? { ...profile, preferredName: profile.preferredName === original.name ? original.next : profile.preferredName, location: profile.location === original.location ? "Delran" : profile.location } : profile;
}

export function usePatientProfile() {
  const [profile, setProfile] = useState<PatientProfile>({ ...emptyProfile });
  const [savedProfiles, setSavedProfiles] = useState<Record<string, PatientProfile>>({});
  const savedRef = useRef(savedProfiles);
  const [remember, setRemember] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const loaded = useRef(false);
  useEffect(() => {
    // Strict Mode replays effects. A second hydration must not replace a visit snapshot.
    if (loaded.current) return;
    loaded.current = true;
    try {
      const library = localStorage.getItem(LIBRARY_KEY);
      if (library !== null) {
        const parsed = library.length <= 1_000_000 ? librarySchema.safeParse(JSON.parse(library)) : null;
        if (!parsed?.success) throw new Error("Unreadable profile library");
        const profiles = { ...parsed.data.profiles };
        const removed = Object.hasOwn(profiles, REMOVED_SAMPLE_ID);
        delete profiles[REMOVED_SAMPLE_ID];
        savedRef.current = profiles; setSavedProfiles(profiles);
        const activeId = parsed.data.activeId === REMOVED_SAMPLE_ID ? SAMPLE_PROFILES[0].recordId : parsed.data.activeId;
        if (activeId) {
          setProfile(profiles[activeId] ?? { ...SAMPLE_PROFILES[0] });
          setRemember(Boolean(profiles[activeId]));
        }
        if (removed) {
          try { persistProfiles(profiles, activeId && profiles[activeId] ? activeId : null); }
          catch { setMessage("The removed sample is hidden, but its saved browser copy could not be updated."); }
        }
      } else {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = raw.length <= 20_000 ? patientProfileSchema.safeParse(JSON.parse(raw)) : null;
          if (parsed?.success) {
            if (parsed.data.recordId === REMOVED_SAMPLE_ID) {
              setProfile({ ...SAMPLE_PROFILES[0] });
              persistProfiles({}, null);
            } else {
              const restored = renameOriginalSample(parsed.data);
              const profiles = { [restored.recordId]: restored };
              savedRef.current = profiles; setSavedProfiles(profiles); setProfile(restored); setRemember(true);
            }
          }
          else { localStorage.removeItem(STORAGE_KEY); setMessage("The saved profile was unreadable. Please enter it again."); }
        }
      }
    } catch { setMessage("Browser storage is unavailable. Your profile can still be used in this session."); }
    setReady(true);
  }, []);
  function persistProfiles(profiles: Record<string, PatientProfile>, activeId: string | null) {
    const library = librarySchema.parse({ version: 1, activeId, profiles });
    const serialized = JSON.stringify(library);
    if (serialized.length > 1_000_000) throw new Error("Profile storage limit reached");
    localStorage.setItem(LIBRARY_KEY, serialized);
    savedRef.current = profiles; setSavedProfiles(profiles);
    // The library is authoritative; failure to remove a legacy copy cannot restore it.
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* New library already saved. */ }
  }
  function save(value: PatientProfile, persist: boolean) {
    if (value.recordId === REMOVED_SAMPLE_ID) { setMessage("Check profile: This sample has been removed. Choose Ege to edit and save a profile."); return false; }
    const parsed = patientProfileSchema.safeParse(value);
    if (!parsed.success) { setMessage("Check profile details: " + parsed.error.issues[0]?.message); return false; }
    setProfile(parsed.data); setRemember(persist);
    try {
      const profiles = { ...savedRef.current };
      if (persist) profiles[parsed.data.recordId] = parsed.data;
      else delete profiles[parsed.data.recordId];
      persistProfiles(profiles, persist ? parsed.data.recordId : null);
      setMessage(persist ? "Profile saved in this browser." : "Standalone profile is session-only. Any snapshots saved in visits remain separate.");
    } catch { setRemember(false); setMessage("Profile active for this session, but browser storage could not be updated. Clear site data to remove an older saved copy."); }
    return true;
  }
  function clear() {
    const profiles = { ...savedRef.current }; delete profiles[profile.recordId];
    setProfile({ ...emptyProfile, recordId: crypto.randomUUID() }); setRemember(false);
    try { persistProfiles(profiles, null); setMessage("Profile cleared."); }
    catch { setMessage("Profile cleared for this session. Clear site data to remove any saved copy."); }
  }
  function activate(value: PatientProfile, hasSnapshot: boolean) {
    setProfile(patientProfileSchema.parse(value)); setRemember(false);
    setMessage(hasSnapshot ? "Using this visit’s saved patient snapshot. Your separately remembered profile is unchanged." : "Patient details were not saved with this visit. AI profile context is off; check the patient before continuing.");
  }
  return { profile, savedProfiles, remember, ready, message, save, clear, activate };
}
