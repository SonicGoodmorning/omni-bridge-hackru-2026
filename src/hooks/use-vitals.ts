"use client";
import { useEffect, useState } from "react";
import { numbersStoreSchema, readingSchema, seedReadings, type NumbersStore, type Reading } from "@/lib/vitals/data";
import type { PatientProfile } from "@/lib/patient/profile";
const KEY = "omni-bridge-numbers-v1";
export function useVitals() {
  const [store, setStore] = useState<NumbersStore>({});
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = raw.length <= 2_000_000 ? numbersStoreSchema.safeParse(JSON.parse(raw)) : null;
        if (parsed?.success && Object.keys(parsed.data).length <= 50) setStore(parsed.data);
        else setMessage("Saved numbers could not be read. New entries can still be used in this session; clear saved numbers to remove the old copy.");
      }
    } catch { setMessage("Browser storage is unavailable. Numbers will stay in this session."); }
    setReady(true);
  }, []);
  function readings(profile: PatientProfile): Reading[] { return store[profile.recordId]?.readings ?? seedReadings(profile.sampleId, profile.weightKg); }
  function commit(next: NumbersStore) {
    setStore(next);
    try {
      const saved = Object.fromEntries(Object.entries(next).filter(([, value]) => value.remember));
      const serialized = JSON.stringify(saved);
      if (Object.keys(saved).length > 50 || serialized.length > 2_000_000) throw new Error("Storage limit reached");
      if (Object.keys(saved).length) localStorage.setItem(KEY, serialized); else localStorage.removeItem(KEY);
      setMessage("");
    } catch {
      setMessage("Numbers updated for this session, but browser saving failed or its limit was reached. The saving choice could not be applied. Clear site data to remove any older saved copy.");
    }
  }
  function save(profile: PatientProfile, input: Reading) {
    const parsed = readingSchema.safeParse(input);
    if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Check this reading." };
    const current = readings(profile);
    if (current.length >= 600 && !current.some((item) => item.id === input.id)) return { ok: false as const, error: "This profile has 600 readings. Delete an older reading before adding another." };
    commit({ ...store, [profile.recordId]: { readings: [...current.filter((item) => item.id !== input.id), parsed.data], remember: store[profile.recordId]?.remember ?? false } }); return { ok: true as const };
  }
  function remove(profile: PatientProfile, id: string) { commit({ ...store, [profile.recordId]: { readings: readings(profile).filter((item) => item.id !== id), remember: store[profile.recordId]?.remember ?? false } }); }
  function remember(profile: PatientProfile, value: boolean) { commit({ ...store, [profile.recordId]: { readings: readings(profile), remember: value } }); }
  function clearAll() { commit({}); }
  return { ready, message, readings, save, remove, remember, clearAll, isRemembered: (profile: PatientProfile) => store[profile.recordId]?.remember ?? false };
}
