import type { CSSProperties } from "react";
import { ArrowsLeftRightIcon, FileTextIcon, ChatCircleTextIcon, MicrophoneIcon, ArrowRightIcon, CheckIcon, CaretRightIcon, QuestionIcon, ArrowCounterClockwiseIcon, CopyIcon, XIcon, StopIcon, GlobeHemisphereWestIcon, WarningIcon, ClockIcon, EyeIcon, SparkleIcon, SunIcon, MoonIcon, PlusIcon, MinusIcon, ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";

export type IconName = "bridge" | "document" | "chat" | "mic" | "arrow" | "check" | "chevron" | "help" | "reset" | "copy" | "close" | "stop" | "globe" | "warning" | "clock" | "eye" | "spark" | "sun" | "moon" | "plus" | "minus" | "arrow-up";
const icons = { bridge: ArrowsLeftRightIcon, document: FileTextIcon, chat: ChatCircleTextIcon, mic: MicrophoneIcon, arrow: ArrowRightIcon, check: CheckIcon, chevron: CaretRightIcon, help: QuestionIcon, reset: ArrowCounterClockwiseIcon, copy: CopyIcon, close: XIcon, stop: StopIcon, globe: GlobeHemisphereWestIcon, warning: WarningIcon, clock: ClockIcon, eye: EyeIcon, spark: SparkleIcon, sun: SunIcon, moon: MoonIcon, plus: PlusIcon, minus: MinusIcon, "arrow-up": ArrowUpRightIcon };

export function Icon({ name, size = 20, className, style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  const Glyph = icons[name];
  return <Glyph size={size} weight="regular" aria-hidden="true" className={className} style={style} />;
}

export function RandomizationDiagram({ locale }: { locale: string }) {
  const words: Record<string, [string, string, string, string]> = {
    "en-US": ["Assignment by chance", "Study tablet", "Placebo", "No active study medicine"],
    "tr-TR": ["Şansa bağlı atama", "Araştırma tableti", "Plasebo", "Etkin araştırma ilacı içermez"],
    "es-419": ["Asignación al azar", "Tableta en investigación", "Placebo", "Sin medicamento activo del estudio"],
    "pt-BR": ["Sorteio do grupo", "Comprimido em estudo", "Placebo", "Sem medicamento ativo do estudo"],
    "hi-IN": ["संयोग से समूह चयन", "अध्ययन की गोली", "प्लेसिबो", "अध्ययन की सक्रिय दवा नहीं"],
    "zh-CN": ["随机分组", "研究用药片", "安慰剂", "不含研究中的活性药物"],
  };
  const [title, treatment, placebo, note] = words[locale] || words["en-US"];
  return <figure className="randomization-visual" lang={words[locale] ? locale : "en-US"}>
    <figcaption>{title}</figcaption>
    <svg viewBox="0 0 300 80" className="randomization-lines" role="img" aria-label={title}>
      <circle cx="150" cy="14" r="9" fill="currentColor" stroke="none" />
      <path d="M150 23v17M65 66V50a10 10 0 0 1 10-10h150a10 10 0 0 1 10 10v16" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="m60 61 5 5 5-5m160 0 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
    <div className="randomization-groups"><div><strong>50<span>%</span></strong><p>{treatment}</p></div><div><strong>50<span>%</span></strong><p>{placebo}</p><small>{note}</small></div></div>
  </figure>;
}

export function VisitTimeline({ locale }: { locale: string }) {
  const words: Record<string, [string, string, string]> = {
    "en-US": ["4 visits · 8 weeks", "About 60 minutes per visit", "A 5 mL blood sample at the first and last visit"],
    "tr-TR": ["4 ziyaret · 8 hafta", "Yaklaşık 60 dakika / ziyaret", "İlk ve son ziyarette 5 mL kan örneği"],
    "es-419": ["4 visitas · 8 semanas", "Aproximadamente 60 minutos por visita", "Muestra de sangre de 5 mL en la primera y última visita"],
    "pt-BR": ["4 visitas · 8 semanas", "Aproximadamente 60 minutos por visita", "Amostra de sangue de 5 mL na primeira e última visita"],
    "hi-IN": ["4 मुलाक़ातें · 8 सप्ताह", "प्रति मुलाक़ात लगभग 60 मिनट", "पहली और आखिरी मुलाक़ात में 5 mL रक्त का नमूना"],
    "zh-CN": ["4次访视 · 8周", "每次访视约60分钟", "首次和末次访视采集5 mL血样"],
  };
  const [title, duration, note] = words[locale] || words["en-US"];
  return <figure className="timeline-visual" lang={words[locale] ? locale : "en-US"}><figcaption>{title}</figcaption><ol>{[1, 2, 3, 4].map((visit) => <li key={visit}><span>{visit}</span></li>)}</ol><p>{duration}</p><small>{note}</small></figure>;
}
