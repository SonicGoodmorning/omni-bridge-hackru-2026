"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSession } from "./session-provider";
import { Icon } from "./icons";
import { SampleProfiles } from "./sample-profiles";
import { METRICS, displayValue, type MetricId, type Reading } from "@/lib/vitals/data";

function dateLabel(at: string, long = false) { return new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric", ...(long ? { year: "numeric" } : {}) }); }
function localTime(at = new Date().toISOString()) { const date = new Date(at); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`; }
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <span className="metric-no-trend">{values.length ? "First reading" : "No readings yet"}</span>;
  const min = Math.min(...values), range = Math.max(...values) - min || 1;
  return <svg className="metric-sparkline" viewBox="0 0 180 34" aria-hidden="true"><polyline points={values.map((value, i) => `${i / (values.length - 1) * 180},${30 - (value - min) / range * 25}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="1.7" vectorEffect="non-scaling-stroke" /></svg>;
}
function TrendChart({ readings, start, end, metric }: { readings: Reading[]; start: number; end: number; metric: typeof METRICS[number] }) {
  if (!readings.length) return <div className="numbers-empty"><h3>No readings in this range</h3><p>Log a reading to start a trend, or choose a sample person.</p></div>;
  const values = readings.flatMap((reading) => reading.secondary === null ? [reading.value] : [reading.value, reading.secondary]);
  const low = Math.max(0, Math.floor(Math.min(...values) - (metric.id === "steps" ? 500 : metric.id === "weight" || metric.id === "sleep" ? 1 : 3)));
  const high = Math.ceil(Math.max(...values) + (metric.id === "steps" ? 500 : metric.id === "weight" || metric.id === "sleep" ? 1 : 3));
  const x = (at: string) => 54 + (Date.parse(at) - start) / (end - start) * 790;
  const y = (value: number) => 220 - (value - low) / (high - low || 1) * 190;
  const points = (secondary = false) => readings.map((reading) => `${x(reading.at)},${y(secondary ? reading.secondary ?? reading.value : reading.value)}`).join(" ");
  return <div className="trend-visual"><svg viewBox="0 0 870 255" role="img" aria-label={`${metric.name} trend, ${readings.length} readings. Exact values are in the reading history below.`}>
    {[low, (low + high) / 2, high].map((value) => <g key={value}><line x1="54" x2="850" y1={y(value)} y2={y(value)} className="chart-grid"/><text x="38" y={y(value) + 4} textAnchor="end" className="chart-label">{Number(value.toFixed(1)).toLocaleString()}</text></g>)}
    <polyline points={points()} className="chart-line" />{metric.id === "pressure" && <polyline points={points(true)} className="chart-line chart-secondary" />}
    {readings.map((reading) => <circle key={reading.id} cx={x(reading.at)} cy={y(reading.value)} r="3.7" className="chart-dot"><title>{dateLabel(reading.at)}: {displayValue(reading)} {metric.unit}</title></circle>)}
    <text x="54" y="250" className="chart-label">{dateLabel(new Date(start).toISOString())}</text><text x="844" y="250" textAnchor="end" className="chart-label">{dateLabel(new Date(end).toISOString())}</text>
  </svg></div>;
}
function ReadingDialog({ metricId, existing, onClose }: { metricId: MetricId; existing?: Reading; onClose: () => void }) {
  const session = useSession(); const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<MetricId>(existing?.metric ?? metricId);
  const [value, setValue] = useState(existing ? String(existing.value) : "");
  const [secondary, setSecondary] = useState(existing?.secondary === undefined || existing.secondary === null ? "" : String(existing.secondary));
  const [at, setAt] = useState(localTime(existing?.at)); const [note, setNote] = useState(existing?.note ?? ""); const [error, setError] = useState("");
  const metric = METRICS.find((item) => item.id === selected)!;
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal(); element?.querySelector("select")?.focus();
    return () => { element?.close(); previous?.focus(); };
  }, []);
  return <dialog className="reading-dialog" ref={dialog} aria-labelledby="reading-dialog-title" onCancel={(event) => { event.preventDefault(); onClose(); }}><form onSubmit={(event) => {
    event.preventDefault(); const date = new Date(at);
    if (!Number.isFinite(date.getTime())) { setError("Choose a valid date and time."); return; }
    if (date.getTime() > Date.now() + 60000) { setError("Choose a time that is not in the future."); return; }
    const result = session.vitals.save(session.patient.profile, { id: existing?.id ?? crypto.randomUUID(), metric: selected, value: Number(value), secondary: selected === "pressure" ? Number(secondary) : null, at: date.toISOString(), note: note.trim(), source: "manual" });
    if (result.ok) onClose(); else setError(result.error);
  }}><div className="reading-dialog-heading"><div><p className="eyebrow">{session.patient.profile.preferredName || "YOUR NUMBERS"}</p><h2 id="reading-dialog-title">{existing ? "Edit reading" : "Log a reading"}</h2></div><button type="button" className="numbers-icon-button" aria-label="Close reading form" onClick={onClose}><Icon name="close" size={20} /></button></div>
    <label>Metric<select value={selected} onChange={(event) => { setSelected(event.target.value as MetricId); setValue(""); setSecondary(""); setError(""); }}>{METRICS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <p className="reading-help">{metric.description}</p><div className="reading-value-fields"><label>{selected === "pressure" ? "Upper (systolic)" : `Value (${metric.unit})`}<input type="number" required min={metric.min} max={metric.max} step={metric.step} value={value} onChange={(event) => setValue(event.target.value)} /></label>{selected === "pressure" && <label>Lower (diastolic)<input type="number" required min={20} max={200} step={1} value={secondary} onChange={(event) => setSecondary(event.target.value)} /></label>}</div>
    <label>When (your local time)<input type="datetime-local" required max={localTime()} value={at} onChange={(event) => setAt(event.target.value)} /></label><label>Note (optional)<input value={note} maxLength={200} onChange={(event) => setNote(event.target.value)} placeholder="For example: taken before breakfast" /></label>
    {(error || session.vitals.message) && <p className="reading-error" role="alert">{error} {session.vitals.message}</p>}
    <div className="reading-dialog-footer"><button type="button" className="text-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button">{existing ? "Save changes" : "Save reading"}</button></div>
  </form></dialog>;
}
export function NumbersWorkspace() {
  const session = useSession(); const profile = session.patient.profile;
  const [metricId, setMetricId] = useState<MetricId>("heart"); const [days, setDays] = useState(7);
  const [editor, setEditor] = useState<{ metric: MetricId; reading?: Reading } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null); const [clear, setClear] = useState(false); const [limit, setLimit] = useState(10); const [samples, setSamples] = useState(false);
  const metric = METRICS.find((item) => item.id === metricId)!;
  const all = session.vitals.readings(profile).slice().sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const end = new Date(); end.setHours(23, 59, 59, 999); const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - days + 1);
  const inRange = all.filter((reading) => Date.parse(reading.at) >= start.getTime() && Date.parse(reading.at) <= end.getTime());
  const selected = inRange.filter((reading) => reading.metric === metricId);
  const latest = selected.at(-1), first = selected[0];
  const change = latest && first && latest.id !== first.id ? Number((latest.value - first.value).toFixed(1)) : null;
  const daysLogged = new Set(inRange.map((reading) => new Date(reading.at).toLocaleDateString())).size;
  const history = selected.slice().reverse();
  useEffect(() => { setEditor(null); setDeleting(null); setLimit(10); }, [profile.recordId]);
  return <main className="numbers-workspace">
    <header className="numbers-heading"><div><h1>My numbers</h1><p>Keep track of your readings over time.</p></div><button className="primary-button numbers-log-button" onClick={() => setEditor({ metric: metricId })}><Icon name="plus" size={18} /> Log a reading</button></header>
    <div className="numbers-person"><div className="person-monogram" aria-hidden="true">{profile.preferredName.slice(0, 1) || "○"}</div><div className="person-details"><strong>{profile.preferredName || "Your profile"}{profile.sampleId && <span className="fictional-person">FICTIONAL SAMPLE</span>}</strong><p>{[profile.age === null ? null : `${profile.age} years`, profile.sex === "unspecified" ? null : profile.sex === "self-described" ? "Sex: self-described" : profile.sex.charAt(0).toUpperCase() + profile.sex.slice(1), profile.heightCm === null ? null : `${profile.heightCm} cm`, profile.weightKg === null ? null : `${profile.weightKg} kg · profile weight`].filter(Boolean).join("  ·  ") || "Add your details in Patient profile"}</p></div><Link href="/profile" className="text-button">Edit profile <Icon name="arrow-up" size={14} /></Link><button className="text-button" onClick={() => setSamples(!samples)} aria-expanded={samples} aria-controls="numbers-samples">Switch person <Icon name={samples ? "minus" : "plus"} size={14} /></button></div>
    {samples && <section id="numbers-samples"><SampleProfiles current={profile.sampleId} onSelect={(value) => { session.savePatientProfile(value, Boolean(session.patient.savedProfiles[value.recordId]), value.preferredLanguage); setSamples(false); }} /><p className="numbers-switch-note">Switching starts a fresh conversation. Saved profile edits and numbers are kept separately for each person. Previous saved conversations remain available.</p></section>}
    <div className="numbers-toolbar"><div><h2>Overview</h2><span>{profile.sampleId ? "Fictional history + your manual entries" : "Manually entered readings"} · no device connected</span></div><div className="numbers-range" role="group" aria-label="Date range">{[7, 30].map((value) => <button key={value} aria-pressed={days === value} onClick={() => { setDays(value); setLimit(10); }}>Last {value} days</button>)}</div></div>
    <div className="numbers-dashboard">
    <div className="metric-grid" role="group" aria-label="Health metrics">{METRICS.map((item) => {
      const readings = inRange.filter((reading) => reading.metric === item.id), reading = readings.at(-1);
      return <button key={item.id} className={`metric-widget ${metricId === item.id ? "is-selected" : ""}`} aria-pressed={metricId === item.id} aria-controls="numbers-trend-panel" onClick={() => { setMetricId(item.id); setLimit(10); setDeleting(null); }}><div className="metric-widget-top"><span>{item.short}</span><Icon name="arrow-up" size={16} /></div><div className={`metric-number ${reading ? "" : "metric-number-empty"}`}>{reading ? displayValue(reading) : "Not logged"}<small>{item.unit}</small></div><Sparkline values={readings.slice(-14).map((value) => value.value)} /><span className="metric-updated">{reading ? dateLabel(reading.at) : "Log your first reading"}</span></button>;
    })}</div>
    <section className="numbers-trend" id="numbers-trend-panel" aria-labelledby="trend-title"><div className="trend-main"><div className="trend-heading"><div><p className="trend-period">{days}-day trend</p><h2 id="trend-title">{metric.name}</h2></div>{metricId === "pressure" && <div className="pressure-legend"><span>━ Upper</span><span>┄ Lower</span></div>}</div><div className={`trend-stat ${latest ? "" : "trend-stat-empty"}`}><strong>{latest ? displayValue(latest) : "Not logged"}</strong><span>{metric.unit}<small>{latest ? `Latest · ${dateLabel(latest.at)}` : "No reading yet"}</small></span></div><TrendChart readings={selected} start={start.getTime()} end={end.getTime()} metric={metric} /><p className="chart-caption">{selected.length} {selected.length === 1 ? "entry" : "entries"} in this range. Lines connect logged readings.</p></div>
      <aside className="numbers-insight"><div className="logging-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="51" className="ring-track"/><circle cx="60" cy="60" r="51" className="ring-fill" strokeDasharray={`${daysLogged / days * 320.44} 320.44`} /></svg><div><strong>{daysLogged}<small>/{days}</small></strong><span>Days logged</span></div></div><div className="recording-summary"><h3>Days logged</h3><p>Days with at least one reading in this range.</p></div><div className="trend-difference"><span>First to latest</span><strong>{change === null ? "No change to compare" : `${change > 0 ? "+" : ""}${change.toLocaleString()} ${metric.unit}`}</strong>{metricId === "pressure" && <small>Change in upper reading only</small>}</div></aside>
      <p className="numbers-neutral-note">Trends describe your log. They do not assess your health or set clinical targets.</p>
    </section>
    </div>
    <section className="numbers-history" aria-labelledby="history-title"><div className="history-heading"><div><h2 id="history-title">Reading history</h2><p>{metric.name}</p></div><span>{history.length} in this range</span></div>{history.length ? <><div className="reading-table-wrap"><table className="reading-table"><thead><tr><th scope="col">Date & time</th><th scope="col">Reading</th><th scope="col">Source / note</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{history.slice(0, limit).map((reading) => <tr key={reading.id}><td>{dateLabel(reading.at, true)}<small>{new Date(reading.at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</small></td><td><strong>{displayValue(reading)}</strong> <span>{metric.unit}</span></td><td><span className="reading-source">{reading.source === "sample" ? "Fictional sample" : "Manual entry"}</span>{reading.note && reading.source !== "sample" && <small>{reading.note}</small>}</td><td><div className="reading-actions">{deleting === reading.id ? <><span>Delete?</span><button onClick={() => { session.vitals.remove(profile, reading.id); setDeleting(null); }}>Yes</button><button onClick={() => setDeleting(null)}>Keep</button></> : <><button aria-label={`Edit reading from ${dateLabel(reading.at)} at ${new Date(reading.at).toLocaleTimeString()}`} onClick={() => setEditor({ metric: reading.metric, reading })}>Edit</button><button aria-label={`Delete reading from ${dateLabel(reading.at)} at ${new Date(reading.at).toLocaleTimeString()}`} onClick={() => setDeleting(reading.id)}>Delete</button></>}</div></td></tr>)}</tbody></table></div>{history.length > limit && <button className="text-button" onClick={() => setLimit(limit + 20)}>Show more readings ↓</button>}</> : <p className="history-empty">No {metric.name.toLowerCase()} readings in this range. Use “Log a reading” to add one.</p>}</section>
    <footer className="numbers-footer"><label><input type="checkbox" checked={session.vitals.isRemembered(profile)} onChange={(event) => session.vitals.remember(profile, event.target.checked)} /><span>Save this person’s numbers in this browser<small>Optional, unencrypted storage. Otherwise manual entries last for this page session. To restore a personal profile’s numbers after refresh, remember the profile too.</small></span></label><button className="text-button" onClick={() => setClear(!clear)}>Clear all numbers</button></footer>
    {clear && <div className="numbers-clear" role="alert"><p>Delete all manually entered and saved numbers for every profile? Fictional sample histories will reset.</p><button className="text-button" onClick={() => { session.vitals.clearAll(); setClear(false); }}>Delete all numbers</button><button className="text-button" onClick={() => setClear(false)}>Keep numbers</button></div>}
    <p role="status" className="numbers-storage-message">{session.vitals.message}</p>
    {editor && <ReadingDialog key={`${profile.recordId}-${editor.reading?.id ?? "new"}`} metricId={editor.metric} existing={editor.reading} onClose={() => setEditor(null)} />}
  </main>;
}
