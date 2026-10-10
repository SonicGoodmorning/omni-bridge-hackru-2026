import { Workspace } from "@/components/workspace";

export const dynamic = "force-dynamic";

export default function Home() {
  return <Workspace liveAvailable={Boolean(process.env.GEMINI_API_KEY?.trim())} />;
}
