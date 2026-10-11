"use client";
import { SAMPLE_PROFILES } from "@/lib/patient/samples";
import type { PatientProfile } from "@/lib/patient/profile";
import { useSession } from "./session-provider";
export function SampleProfiles({ current, onSelect }: { current: string | null; onSelect: (profile: PatientProfile) => void }) {
  const { patient } = useSession();
  const profiles = SAMPLE_PROFILES.map((sample) => patient.savedProfiles[sample.recordId] ?? sample);
  return <div className="sample-profiles"><div><strong>Choose a person</strong><span>Editable profile · saved changes load when selected</span></div><div className="sample-profile-buttons">{profiles.map((profile) => <button type="button" key={profile.sampleId} aria-pressed={profile.sampleId === current} onClick={() => onSelect({ ...profile })}>{profile.preferredName}, {profile.age}</button>)}</div></div>;
}
