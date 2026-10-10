import { VisitsWorkspace } from "@/components/visits-workspace";
import "./visits.css";

export const dynamic = "force-dynamic";

export default function VisitsPage() {
  return <VisitsWorkspace liveAvailable={Boolean(process.env.GEMINI_API_KEY?.trim())} />;
}
