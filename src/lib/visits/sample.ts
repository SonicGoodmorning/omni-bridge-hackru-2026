import { BridgeServiceError } from "../bridge/errors";
import type { Locale } from "../types";
import type { VisitRequest, VisitResult, VisitSpeaker } from "./types";

export interface SampleVisitTurn {
  id: string;
  speaker: VisitSpeaker;
  english: string;
  text: Record<Locale, string>;
}

// Prepared fictional examples, not generated translations or clinical guidance.
export const SAMPLE_VISIT: SampleVisitTurn[] = [
  {
    id: "welcome", speaker: "clinician",
    english: "Let's discuss this fictional study. Taking part is your choice. What would you like to ask?",
    text: {
      "tr-TR": "Bu kurgusal çalışmayı konuşalım. Katılıp katılmamak sizin seçiminiz. Ne sormak istersiniz?",
      "es-419": "Hablemos de este estudio ficticio. Participar es decisión suya. ¿Qué le gustaría preguntar?",
      "pt-BR": "Vamos conversar sobre este estudo fictício. Participar é uma escolha sua. O que você gostaria de perguntar?",
      "hi-IN": "आइए इस काल्पनिक अध्ययन के बारे में बात करें। इसमें भाग लेना आपकी मर्ज़ी है। आप क्या पूछना चाहेंगे?",
      "zh-CN": "我们来谈谈这项虚构的研究。是否参加由您自己决定。您想问些什么？",
    },
  },
  {
    id: "placebo-question", speaker: "participant",
    english: "Do I have a 50% chance of receiving the placebo?",
    text: {
      "tr-TR": "Plasebo alma olasılığım %50 mi?",
      "es-419": "¿Tengo un 50% de probabilidad de recibir el placebo?",
      "pt-BR": "Tenho 50% de chance de receber o placebo?",
      "hi-IN": "क्या मुझे प्लेसीबो मिलने की संभावना 50% है?",
      "zh-CN": "我有50%的可能性接受安慰剂吗？",
    },
  },
  {
    id: "randomization-answer", speaker: "clinician",
    english: "Yes. There is a 50% chance of either group. Neither you nor the researcher chooses the group.",
    text: {
      "tr-TR": "Evet. Her iki gruba atanma olasılığı %50'dir. Grubu ne siz ne de araştırmacı seçer.",
      "es-419": "Sí. Hay un 50% de probabilidad de quedar en cada grupo. Ni usted ni el investigador eligen el grupo.",
      "pt-BR": "Sim. Há 50% de chance de ficar em cada grupo. Nem você nem o pesquisador escolhem o grupo.",
      "hi-IN": "हाँ। प्रत्येक समूह में जाने की संभावना 50% है। समूह का चुनाव न आप करते हैं, न शोधकर्ता।",
      "zh-CN": "是的。分到任何一组的可能性都是50%。您和研究人员都不能选择分组。",
    },
  },
  {
    id: "visits-question", speaker: "participant",
    english: "How many visits are there, and how long do they last?",
    text: {
      "tr-TR": "Kaç ziyaret var ve her biri ne kadar sürüyor?",
      "es-419": "¿Cuántas visitas hay y cuánto dura cada una?",
      "pt-BR": "Quantas visitas são e quanto tempo dura cada uma?",
      "hi-IN": "कितनी मुलाकातें होंगी और हर मुलाकात कितनी देर चलेगी?",
      "zh-CN": "一共有几次访视，每次持续多长时间？",
    },
  },
  {
    id: "visits-answer", speaker: "clinician",
    english: "There are 4 visits over 8 weeks. Each visit lasts about 60 minutes.",
    text: {
      "tr-TR": "8 hafta içinde 4 ziyaret var. Her ziyaret yaklaşık 60 dakika sürer.",
      "es-419": "Hay 4 visitas durante 8 semanas. Cada visita dura aproximadamente 60 minutos.",
      "pt-BR": "São 4 visitas ao longo de 8 semanas. Cada visita dura cerca de 60 minutos.",
      "hi-IN": "8 हफ़्तों में 4 मुलाकातें होंगी। हर मुलाकात लगभग 60 मिनट चलेगी।",
      "zh-CN": "8周内共有4次访视。每次访视大约持续60分钟。",
    },
  },
  {
    id: "withdrawal-question", speaker: "participant",
    english: "If I decide to leave, will my regular care change?",
    text: {
      "tr-TR": "Ayrılmaya karar verirsem normal sağlık bakımım değişir mi?",
      "es-419": "Si decido retirarme, ¿cambiará mi atención médica habitual?",
      "pt-BR": "Se eu decidir sair, meu atendimento de saúde habitual vai mudar?",
      "hi-IN": "अगर मैं अध्ययन छोड़ने का फैसला करूँ, तो क्या मेरी नियमित स्वास्थ्य देखभाल बदल जाएगी?",
      "zh-CN": "如果我决定退出，我的常规医疗照护会改变吗？",
    },
  },
  {
    id: "withdrawal-answer", speaker: "clinician",
    english: "You can leave at any time without penalty. Leaving will not affect your regular care.",
    text: {
      "tr-TR": "İstediğiniz zaman herhangi bir ceza olmadan ayrılabilirsiniz. Ayrılmanız normal sağlık bakımınızı etkilemez.",
      "es-419": "Puede retirarse en cualquier momento sin penalización. Retirarse no afectará su atención médica habitual.",
      "pt-BR": "Você pode sair a qualquer momento, sem penalidade. Sair não afetará seu atendimento de saúde habitual.",
      "hi-IN": "आप किसी भी समय बिना किसी दंड के अध्ययन छोड़ सकते हैं। छोड़ने से आपकी नियमित स्वास्थ्य देखभाल पर असर नहीं पड़ेगा।",
      "zh-CN": "您可以随时退出，不会受到处罚。退出不会影响您的常规医疗照护。",
    },
  },
  {
    id: "family-choice", speaker: "participant",
    english: "Thank you. I would like to discuss it with my family before deciding.",
    text: {
      "tr-TR": "Teşekkür ederim. Karar vermeden önce ailemle konuşmak istiyorum.",
      "es-419": "Gracias. Me gustaría hablarlo con mi familia antes de decidir.",
      "pt-BR": "Obrigado. Gostaria de conversar com minha família antes de decidir.",
      "hi-IN": "धन्यवाद। फैसला करने से पहले मैं अपने परिवार से बात करना चाहूँगा।",
      "zh-CN": "谢谢。我想先和家人商量，再做决定。",
    },
  },
];

function normalized(text: string) {
  return text.normalize("NFKC").toLowerCase()
    .replace(/[!?.,;:।。！？、，；：“”"'’‘()[\]{}]/gu, (mark, index: number, source: string) => mark === "." && /\d/.test(source[index - 1] ?? "") && /\d/.test(source[index + 1] ?? "") ? mark : "")
    .replace(/\s+/g, " ").trim();
}

export function sampleVisit(request: VisitRequest, elapsedMs = 0): VisitResult {
  const turn = SAMPLE_VISIT.find((item) => item.speaker === request.speaker
    && normalized(request.text) === normalized(request.speaker === "clinician" ? item.english : item.text[request.locale]));
  if (!turn) throw new BridgeServiceError("SAMPLE_TEXT_UNAVAILABLE", "Sample mode translates only the prepared visit turns. Choose a sample turn or explicitly select Live mode for your own conversation.", 422, false);
  const participant = request.speaker === "participant";
  const sourceText = participant ? turn.text[request.locale] : turn.english;
  return {
    requestId: request.requestId, locale: request.locale, engine: "sample", speaker: request.speaker,
    sourceText, sourceLanguage: participant ? request.locale : "en-US", targetLanguage: participant ? "en-US" : request.locale,
    translation: participant ? turn.english : turn.text[request.locale], reverseTranslation: sourceText,
    flags: [
      { code: "SAMPLE_FIXTURE", severity: "info", message: "Prepared fictional visit example. Both directions are fixtures, not live AI or a blind translation check." },
      { code: "REVIEW_AID", severity: "info", message: "Review both speakers' meaning before sharing. A reverse translation does not establish translation accuracy." },
    ], elapsedMs, canRelease: true,
  };
}
