import { BridgeServiceError } from "../bridge/errors";
import { hasPreparedSamples, type SampleLocale } from "../types";
import type { DocumentRequest, DocumentResult, DocumentSource } from "./types";
import { reviewDocument } from "./review";

const translations: Record<SampleLocale, [string, string, string]> = {
  "en-US": ["This is a made-up summary of a follow-up clinic visit, not a real medical record.", "The made-up note records high blood pressure without symptoms. The recorded blood pressure is 148/94 mmHg.", "The made-up clinician’s recorded plan lists 10 mg lisinopril daily. The note says not to stop it without contacting the clinic. It also lists a blood test in 2 weeks and a follow-up visit in 4 weeks."],
  "tr-TR": [
    "Bu, ayakta takip ziyareti için hazırlanmış kurgusal bir özettir. Bir gösterimdir, gerçek bir kayıt değildir.",
    "Kurgusal not, belirti olmadan yüksek tansiyon kaydedildiğini söylüyor. Kaydedilen kan basıncı 148/94 mmHg.",
    "Kurgusal klinisyenin notunda günlük 10 mg lisinopril yer alıyor. Not, klinikle iletişime geçmeden ilacın bırakılmamasını söylüyor. Ayrıca 2 hafta sonra kan testi ve 4 hafta sonra takip ziyareti listeleniyor.",
  ],
  "es-419": [
    "Este es un resumen ficticio de una visita de seguimiento ambulatoria. Es una demostración, no un registro real.",
    "La nota ficticia registra presión arterial alta sin síntomas. La presión registrada es de 148/94 mmHg.",
    "El plan documentado del profesional ficticio incluye lisinopril de 10 mg al día. La nota dice que no se debe dejar sin contactar a la clínica. También enumera un análisis de sangre en 2 semanas y una visita de seguimiento en 4 semanas.",
  ],
  "pt-BR": [
    "Este é um resumo fictício de uma consulta de acompanhamento ambulatorial. É uma demonstração, não um registro real.",
    "A nota fictícia registra pressão alta sem sintomas. A pressão arterial registrada é 148/94 mmHg.",
    "O plano documentado do profissional fictício lista lisinopril 10 mg por dia. A nota diz para não interromper sem entrar em contato com a clínica. Também lista um exame de sangue em 2 semanas e uma consulta de acompanhamento em 4 semanas.",
  ],
  "hi-IN": [
    "यह बाह्य-रोगी अनुवर्ती मुलाकात का एक काल्पनिक सारांश है। यह प्रदर्शन है, वास्तविक रिकॉर्ड नहीं।",
    "काल्पनिक नोट में बिना लक्षणों के उच्च रक्तचाप दर्ज है। दर्ज रक्तचाप 148/94 mmHg है।",
    "काल्पनिक चिकित्सक की दर्ज योजना में रोज़ 10 mg lisinopril लिखा है। नोट कहता है कि क्लिनिक से संपर्क किए बिना इसे बंद न करें। इसमें 2 सप्ताह बाद खून की जाँच और 4 सप्ताह बाद अनुवर्ती मुलाकात भी सूचीबद्ध हैं।",
  ],
  "zh-CN": [
    "这是一份虚构的门诊复诊摘要，仅用于演示，并非真实病历。",
    "虚构记录记载了没有症状的高血压。记录的血压为148/94 mmHg。",
    "虚构医生记录的计划列有每天10 mg lisinopril。记录说明，在联系诊所之前不要停用。记录还列有2周后验血和4周后复诊。",
  ],
};

export function sampleDocument(request: DocumentRequest, source: DocumentSource, elapsedMs: number): DocumentResult {
  const locale = request.locale;
  if (!hasPreparedSamples(locale)) throw new BridgeServiceError("SAMPLE_LANGUAGE_UNAVAILABLE", "This language needs Gemini live; no prepared document translation is available.", 422, false);
  if (request.source.kind !== "fixture") throw new BridgeServiceError("SAMPLE_TEXT_UNAVAILABLE", "Sample mode explains the two fixed fictional documents. Choose Live Gemini for your pasted synthetic text.", 422, false);
  const blocks = source.paragraphs.map((paragraph, i) => ({ id: paragraph.id, sourceParagraphIds: [paragraph.id], translation: translations[locale][i], backTranslation: paragraph.text }));
  return {
    requestId: request.requestId, locale: request.locale, engine: "sample", source, blocks,
    flags: [{ code: "SAMPLE_FIXTURE", severity: "info", message: "Prepared fictional example. No live AI was called; its English rendering is a fixture, not an independent verification." }, ...reviewDocument(request, source, blocks)],
    elapsedMs, canRelease: true,
  };
}
