import type { CSSProperties } from "react";

export type IconName = "bridge" | "document" | "chat" | "mic" | "arrow" | "check" | "chevron" | "help" | "reset" | "copy" | "close" | "stop" | "globe" | "warning" | "clock" | "eye" | "spark";

const paths: Record<IconName, React.ReactNode> = {
  bridge: <><path d="M3 17V7m18 10V7M3 11c6 0 5 6 9 6s3-6 9-6M3 17h18M7 14v3m10-3v3" /></>,
  document: <><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" /><path d="M14 3v5h5M8 12h8m-8 4h6" /></>,
  chat: <><path d="M20 11a8 8 0 0 1-8 8H5l-3 2 1-6a8 8 0 1 1 17-4Z" /><path d="M8 10h8m-8 4h5" /></>,
  mic: <><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8" /></>,
  arrow: <><path d="M4 12h16m-6-6 6 6-6 6" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 5 .5c0 2-2.5 2-2.5 4m0 3h.01" /></>,
  reset: <><path d="M3 11a9 9 0 1 1 2 7M3 4v7h7" /><path d="M12 7v5l3 2" /></>,
  copy: <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3" /></>,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  stop: <rect x="5" y="5" width="14" height="14" rx="2" />,
  globe: <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18M5 7h14M5 17h14" /></>,
  warning: <><path d="m10.3 4-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0Z" /><path d="M12 9v5m0 3h.01" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  eye: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  spark: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" /></>,
};

export function Icon({ name, size = 20, className, style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>{paths[name]}</svg>;
}

export function RandomizationDiagram({ locale }: { locale: string }) {
  const words: Record<string, [string, string, string, string]> = {
    "tr-TR": ["Şansa bağlı atama", "Araştırma tableti", "Plasebo", "Etkin araştırma ilacı içermez"],
    "es-419": ["Asignación al azar", "Tableta en investigación", "Placebo", "Sin medicamento activo del estudio"],
    "pt-BR": ["Sorteio do grupo", "Comprimido em estudo", "Placebo", "Sem medicamento ativo do estudo"],
    "hi-IN": ["संयोग से समूह चयन", "अध्ययन की गोली", "प्लेसिबो", "अध्ययन की सक्रिय दवा नहीं"],
    "zh-CN": ["随机分组", "研究用药片", "安慰剂", "不含研究中的活性药物"],
  };
  const [title, treatment, placebo, note] = words[locale] || words["tr-TR"];
  return <figure className="randomization-visual" lang={locale}>
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
    "tr-TR": ["4 ziyaret · 8 hafta", "Yaklaşık 60 dakika / ziyaret", "İlk ve son ziyarette 5 mL kan örneği"],
    "es-419": ["4 visitas · 8 semanas", "Aproximadamente 60 minutos por visita", "Muestra de sangre de 5 mL en la primera y última visita"],
    "pt-BR": ["4 visitas · 8 semanas", "Aproximadamente 60 minutos por visita", "Amostra de sangue de 5 mL na primeira e última visita"],
    "hi-IN": ["4 मुलाक़ातें · 8 सप्ताह", "प्रति मुलाक़ात लगभग 60 मिनट", "पहली और आखिरी मुलाक़ात में 5 mL रक्त का नमूना"],
    "zh-CN": ["4次访视 · 8周", "每次访视约60分钟", "首次和末次访视采集5 mL血样"],
  };
  const [title, duration, note] = words[locale] || words["tr-TR"];
  return <figure className="timeline-visual" lang={locale}><figcaption>{title}</figcaption><ol>{[1, 2, 3, 4].map((visit) => <li key={visit}><span>{visit}</span></li>)}</ol><p>{duration}</p><small>{note}</small></figure>;
}
