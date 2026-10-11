import { z } from "zod";
export const METRICS = [
  { id: "heart", name: "Resting heart rate", short: "Heart rate", unit: "bpm", min: 20, max: 300, step: 1, description: "A resting reading, taken while sitting quietly." },
  { id: "pressure", name: "Blood pressure", short: "Blood pressure", unit: "mmHg", min: 40, max: 300, step: 1, description: "Enter both numbers from your blood pressure monitor." },
  { id: "oxygen", name: "Blood oxygen", short: "Blood oxygen", unit: "%", min: 1, max: 100, step: 1, description: "A reading from your pulse oximeter." },
  { id: "sleep", name: "Sleep duration", short: "Sleep", unit: "hours", min: 0, max: 24, step: 0.1, description: "Total hours of sleep for the previous night." },
  { id: "steps", name: "Daily steps", short: "Steps", unit: "steps", min: 0, max: 100000, step: 1, description: "Your daily total from a phone, tracker or manual count." },
  { id: "weight", name: "Body weight", short: "Weight", unit: "kg", min: 1, max: 500, step: 0.1, description: "A reading from your scale in kilograms." },
] as const;
export type MetricId = typeof METRICS[number]["id"];
export const readingSchema = z.object({
  id: z.string().min(1).max(100), metric: z.enum(["heart", "pressure", "oxygen", "sleep", "steps", "weight"]),
  value: z.number().finite(), secondary: z.number().finite().nullable(), at: z.string().datetime(),
  note: z.string().max(200), source: z.enum(["sample", "manual"]),
}).strict().superRefine((reading, ctx) => {
  const metric = METRICS.find((item) => item.id === reading.metric)!;
  if (reading.value < metric.min || reading.value > metric.max || (metric.step === 1 && !Number.isInteger(reading.value))) ctx.addIssue({ code: "custom", message: `Enter ${metric.name.toLowerCase()} between ${metric.min} and ${metric.max}${metric.step === 1 ? " as a whole number" : ""}.` });
  if (reading.metric === "pressure" && (reading.secondary === null || !Number.isInteger(reading.secondary) || reading.secondary < 20 || reading.secondary > 200 || reading.secondary >= reading.value)) ctx.addIssue({ code: "custom", message: "Enter a lower (diastolic) number between 20 and 200, below the upper number." });
  if (reading.metric !== "pressure" && reading.secondary !== null) ctx.addIssue({ code: "custom", message: "This metric uses one number." });
  if (Date.parse(reading.at) > Date.now() + 60000) ctx.addIssue({ code: "custom", message: "Choose a time that is not in the future." });
});
export type Reading = z.infer<typeof readingSchema>;
export const numbersStoreSchema = z.record(z.string().min(1).max(100), z.object({ readings: z.array(readingSchema).max(600), remember: z.boolean() }).strict());
export type NumbersStore = z.infer<typeof numbersStoreSchema>;
export function seedReadings(sampleId: string | null, weight: number | null): Reading[] {
  if (!sampleId) return [];
  const index = ["mei", "carlos", "aylin", "priya", "ana"].indexOf(sampleId);
  if (index < 0) return [];
  const bases = [72 + index * 2, 118 + index * 3, 97, 6.8 + index * .1, 5300 + index * 570, weight ?? 70];
  const now = new Date(); now.setMinutes(0, 0, 0);
  return Array.from({ length: 30 }, (_, day) => METRICS.map((metric, m) => {
    const at = new Date(now); at.setDate(at.getDate() - (29 - day));
    const wave = Math.sin(day * .8 + index + m) * (m === 4 ? 1600 : m === 5 ? .5 : m === 3 ? .7 : m === 2 ? 1 : 5);
    const value = m === 2 ? Math.min(100, Math.round(bases[m] + wave)) : m === 3 || m === 5 ? Math.round((bases[m] + wave) * 10) / 10 : Math.round(bases[m] + wave);
    return { id: `${sampleId}-${day}-${metric.id}`, metric: metric.id, value, secondary: m === 1 ? 76 + index + Math.round(Math.sin(day) * 4) : null, at: at.toISOString(), note: "Fictional sample reading", source: "sample" as const };
  })).flat();
}
export function displayValue(reading: Reading | undefined) {
  return reading ? `${reading.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}${reading.secondary === null ? "" : `/${reading.secondary}`}` : "—";
}
