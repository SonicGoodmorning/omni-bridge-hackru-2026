import { SAMPLE_CONVERSATION, SECTIONS, STUDY } from "../study";
import { hasPreparedSamples, type BridgeRequest, type BridgeResult, type SampleLocale } from "../types";
import { BridgeServiceError } from "./errors";

// Written demonstration fixtures, never a fallback presented as a live AI answer.
// Their English renderings are fixtures too; no independent model call occurs.
const translations: Record<Exclude<SampleLocale, "en-US">, Record<string, string>> = {
  "tr-TR": {
    purpose: "CLEAR, gerçek olmayan bir araştırma örneğidir. Araştırmada denenen bir tablet ile plasebo karşılaştırılır. Plasebo aynı görünür, ancak etkin araştırma ilacı içermez. Denenen tabletin işe yaradığı henüz gösterilmemiştir. Araştırma, normal tıbbi bakımdan farklıdır. Katılmanız sağlığınıza yarar sağlayacağını garanti etmez.",
    randomization: "Katılırsanız, bir bilgisayar sizi rastgele iki gruptan birine atar: denenen tablet grubu veya plasebo grubu. Her gruba atanma olasılığınız %50’dir. Grubu ne siz ne de araştırmacı seçer. Size etkin araştırma ilacı içermeyen bir plasebo verilebilir. Denenen tabletin size yardımcı olacağı garanti değildir.",
    procedures: "Katılım, 8 hafta içinde 4 araştırma ziyareti içerir. Her ziyaret yaklaşık 60 dakika sürer. Araştırma ekibi her ziyarette deneyiminiz hakkında sorular sorar. İlk ve son ziyaretlerde 5 mL kan örneği alınır. Bunlar gerçek olmayan araştırma örneğinin işlemleridir; tıbbi bakımınız için talimat değildir.",
    risks: "Denenen tablet bulantı, baş ağrısı veya başka yan etkilere yol açabilir. Bazı riskler henüz bilinmiyor. Kan alınması kısa süreli rahatsızlığa veya morarmaya yol açabilir. Araştırma ekibi hiçbir yan etki yaşamayacağınızı garanti edemez. Sorularınızı ve kaygılarınızı araştırma ekibiyle konuşun. Bu belge size özel tıbbi tavsiye vermez.",
    voluntary: "Bu araştırmaya katılmak sizin seçiminizdir; zorunlu değildir. Katılmamayı seçebilirsiniz. Kararınız normal bakımınızı veya hakkınız olan yardımları etkilemez. Soru sorabilir ve güvendiğiniz kişilerle konuşmak için zaman ayırabilirsiniz. Bu eğitim aracı sizden imza atmanızı veya onay vermenizi istemez.",
    withdrawal: "Araştırmaya katılmayı istediğiniz zaman bırakabilirsiniz. Bunun için ceza almaz veya hakkınız olan yardımları kaybetmezsiniz. Ayrılmak istediğinizi araştırma ekibine söyleyin; sizinle son araştırma işlemlerini görüşebilirler. Ayrılmanız normal bakımınızı etkilemez. Daha önce toplanan bilgilerinizin ne olacağını ekibe sorun. Bu gerçek olmayan belge, bu konudaki kuralı belirtmez.",
  },
  "es-419": {
    purpose: "CLEAR es un estudio de investigación ficticio. Compara una tableta en investigación con un placebo. El placebo se ve igual, pero no contiene el medicamento activo del estudio. No se ha demostrado que la tableta funcione. La investigación es diferente de la atención médica habitual. Participar no garantiza un beneficio para su salud.",
    randomization: "Si participa, una computadora le asignará al azar uno de dos grupos: la tableta en investigación o el placebo. Tiene un 50% de probabilidad de quedar en cada grupo. Ni usted ni el investigador eligen el grupo. Puede recibir un placebo, que no contiene medicamento activo del estudio. No hay garantía de que la tableta le ayude.",
    procedures: "Participar implica 4 visitas del estudio durante 8 semanas. Cada visita dura aproximadamente 60 minutos. En cada visita, el equipo le preguntará sobre su experiencia. En la primera y la última visita, recogerá una muestra de 5 mL de sangre. Estos son procedimientos de un estudio ficticio, no instrucciones para su atención médica.",
    risks: "La tableta en investigación puede causar náuseas, dolor de cabeza u otros efectos secundarios. Algunos riesgos todavía se desconocen. La extracción de sangre puede causar molestias breves o moretones. El equipo no puede prometer que no tendrá efectos secundarios. Hable con el equipo sobre sus preguntas o preocupaciones. Este documento no ofrece consejos médicos personales.",
    voluntary: "Participar es voluntario: usted decide. Puede elegir no participar. Su decisión no afectará su atención habitual ni los beneficios a los que tiene derecho. Puede hacer preguntas y tomarse tiempo para hablar con personas de su confianza. Esta herramienta educativa no le pide que firme ni que dé su consentimiento.",
    withdrawal: "Puede dejar de participar en cualquier momento, sin sanciones ni pérdida de los beneficios a los que tiene derecho. Avise al equipo si quiere retirarse, para que hablen sobre cualquier procedimiento final del estudio. Retirarse no afectará su atención habitual. Pregunte qué pasará con la información ya recogida; este documento ficticio no especifica esa política.",
  },
  "pt-BR": {
    purpose: "CLEAR é um estudo de pesquisa fictício. Ele compara um comprimido em investigação com um placebo. O placebo tem a mesma aparência, mas não contém o medicamento ativo do estudo. Ainda não foi demonstrado que o comprimido funciona. Pesquisa é diferente do atendimento médico habitual. Participar não garante um benefício para a sua saúde.",
    randomization: "Se participar, um computador colocará você ao acaso em um de dois grupos: comprimido em investigação ou placebo. Você tem 50% de chance de entrar em cada grupo. Nem você nem o pesquisador escolhem o grupo. Você pode receber um placebo, que não contém medicamento ativo do estudo. Não há garantia de que o comprimido ajude você.",
    procedures: "A participação envolve 4 visitas do estudo ao longo de 8 semanas. Cada visita dura aproximadamente 60 minutos. Em cada visita, a equipe fará perguntas sobre sua experiência. Na primeira e na última visita, a equipe coletará uma amostra de 5 mL de sangue. São procedimentos de um estudo fictício, não instruções para o seu atendimento médico.",
    risks: "O comprimido em investigação pode causar náusea, dor de cabeça ou outros efeitos colaterais. Alguns riscos ainda são desconhecidos. A coleta de sangue pode causar desconforto breve ou hematomas. A equipe não pode prometer que você não terá efeitos colaterais. Converse com a equipe sobre dúvidas ou preocupações. Este documento não oferece orientação médica pessoal.",
    voluntary: "Participar é voluntário: a escolha é sua. Você pode decidir não participar. Sua decisão não afetará seu atendimento habitual nem os benefícios aos quais tem direito. Você pode fazer perguntas e ter tempo para conversar com pessoas em quem confia. Esta ferramenta educativa não pede uma assinatura nem o seu consentimento.",
    withdrawal: "Você pode parar de participar a qualquer momento, sem penalidade nem perda dos benefícios aos quais tem direito. Avise a equipe se quiser sair, para conversar sobre eventuais procedimentos finais do estudo. Sair não afetará seu atendimento habitual. Pergunte o que acontecerá com as informações já coletadas; este documento fictício não especifica essa política.",
  },
  "hi-IN": {
    purpose: "CLEAR एक काल्पनिक शोध अध्ययन है। इसमें जाँच की जा रही गोली की तुलना प्लेसीबो से की जाती है। प्लेसीबो वैसा ही दिखता है, लेकिन उसमें अध्ययन की सक्रिय दवा नहीं होती। अभी यह साबित नहीं हुआ है कि जाँच की जा रही गोली काम करती है। शोध, सामान्य चिकित्सा देखभाल से अलग है। भाग लेने से आपके स्वास्थ्य को लाभ होने की गारंटी नहीं है।",
    randomization: "अगर आप भाग लेते हैं, तो कंप्यूटर आपको संयोग से दो समूहों में से एक में रखेगा: जाँच की जा रही गोली वाला समूह या प्लेसीबो वाला समूह। दोनों में से हर समूह में जाने की संभावना 50% है। समूह न आप चुनते हैं, न शोधकर्ता। आपको प्लेसीबो मिल सकता है, जिसमें अध्ययन की सक्रिय दवा नहीं होती। गोली से आपको लाभ होगा, इसकी गारंटी नहीं है।",
    procedures: "भाग लेने पर 8 सप्ताह में अध्ययन के लिए 4 बार आना होगा। हर मुलाकात लगभग 60 मिनट की होगी। हर बार शोध टीम आपके अनुभव के बारे में प्रश्न पूछेगी। पहली और आखिरी मुलाकात में 5 mL खून का नमूना लिया जाएगा। ये काल्पनिक अध्ययन की प्रक्रियाएँ हैं, आपकी चिकित्सा देखभाल के निर्देश नहीं।",
    risks: "जाँच की जा रही गोली से मतली, सिरदर्द या दूसरे दुष्प्रभाव हो सकते हैं। कुछ जोखिम अभी ज्ञात नहीं हैं। खून लेने से थोड़ी देर तक असुविधा या नील पड़ सकता है। शोध टीम यह वादा नहीं कर सकती कि आपको कोई दुष्प्रभाव नहीं होगा। प्रश्नों या चिंताओं के बारे में अध्ययन टीम से बात करें। यह दस्तावेज़ व्यक्तिगत चिकित्सा सलाह नहीं देता।",
    voluntary: "इस अध्ययन में भाग लेना आपकी इच्छा पर निर्भर है। आप भाग न लेने का निर्णय ले सकते हैं। आपके निर्णय से आपकी सामान्य देखभाल या जिन लाभों के आप हकदार हैं, उन पर असर नहीं पड़ेगा। आप प्रश्न पूछ सकते हैं और भरोसेमंद लोगों से चर्चा करने के लिए समय ले सकते हैं। यह शैक्षिक उपकरण आपसे हस्ताक्षर या सहमति नहीं माँगता।",
    withdrawal: "आप कभी भी भाग लेना बंद कर सकते हैं। इसके लिए कोई दंड नहीं होगा और जिन लाभों के आप हकदार हैं, वे नहीं खोएँगे। अगर आप छोड़ना चाहते हैं तो अध्ययन टीम को बताएँ, ताकि वह अंतिम अध्ययन प्रक्रियाओं के बारे में आपसे बात कर सके। छोड़ने से आपकी सामान्य देखभाल पर असर नहीं पड़ेगा। पहले से एकत्र जानकारी का क्या होगा, यह टीम से पूछें; इस काल्पनिक दस्तावेज़ में वह नीति नहीं बताई गई है।",
  },
  "zh-CN": {
    purpose: "CLEAR 是一个虚构的研究。本研究比较一种试验用药片和安慰剂。安慰剂外观相同，但不含本研究的有效药物成分。目前还没有证据证明试验用药片有效。研究与常规医疗不同。参加研究并不保证对您的健康有益。",
    randomization: "如果参加，电脑会随机把您分到两个组中的一个：试验用药片组或安慰剂组。分到每个组的机会都是 50%。您和研究人员都不能选择组别。您可能拿到安慰剂，它不含本研究的有效药物成分。试验用药片不保证对您有帮助。",
    procedures: "参加研究需要在 8 周内到访 4 次。每次大约 60 分钟。每次到访时，研究团队都会询问您的体验。第一次和最后一次到访时，团队会采集 5 mL 血液样本。这些是虚构研究的流程，并非您的医疗护理指示。",
    risks: "试验用药片可能引起恶心、头痛或其他副作用。有些风险目前还不知道。抽血可能引起短暂不适或淤青。研究团队不能保证您不会有任何副作用。如有疑问或担忧，请与研究团队交流。本文件不提供个人医疗建议。",
    voluntary: "是否参加完全自愿，由您决定。您可以选择不参加。您的决定不会影响常规医疗或您有权享有的福利。您可以提问，也可以花时间与信任的人讨论。本教育工具不要求您签字或表示同意。",
    withdrawal: "您可以随时停止参加，不会因此受到处罚，也不会失去您有权享有的福利。如果想退出，请告诉研究团队，以便讨论可能需要完成的最后研究流程。退出不会影响常规医疗。请向团队询问已经收集的信息将如何处理；本虚构文件没有说明这项政策。",
  },
};

const englishExplanations: Record<string, string> = {
  purpose: "CLEAR is a made-up research study. It compares a tablet being tested with a placebo. A placebo looks the same but has no active study drug. The tested tablet has not been shown to work. Research is different from regular medical care. Joining does not guarantee a health benefit.",
  randomization: "If you join, a computer chooses your group by chance: the tested tablet or the placebo. You have a 50% chance of each group. Neither you nor the researcher chooses. You may get a placebo, which has no active study drug. The tested tablet is not guaranteed to help you.",
  procedures: "Taking part means 4 study visits over 8 weeks. Each visit takes about 60 minutes. The team asks about your experience at each visit. At the first and last visits, the team collects 5 mL of blood. These are made-up research procedures, not instructions for your medical care.",
  risks: "The tested tablet may cause nausea (feeling sick to your stomach), headache, or other side effects. Some risks are not yet known. Taking blood may briefly hurt or cause bruising. The team cannot promise that you will have no side effects. Talk with the study team about questions or concerns. This document does not give personal medical advice.",
  voluntary: "Joining is your choice. You can choose not to join. Your choice will not affect your regular care or benefits you are entitled to. You can ask questions and take time to talk with people you trust. This education tool does not ask you to sign or give consent.",
  withdrawal: "You can stop taking part at any time without a penalty or losing benefits you are entitled to. Tell the team if you want to leave so they can discuss any final study procedures. Leaving will not affect your regular care. Ask what happens to information already collected; this made-up document does not say.",
};

const conversationTranslations: Record<Exclude<SampleLocale, "en-US">, string> = {
  "tr-TR": "İki gruptan her birine atanma olasılığınız %50’dir. Grubu ne siz ne de araştırmacı seçer. Size etkin araştırma ilacı içermeyen bir plasebo verilebilir.",
  "es-419": "Tiene un 50% de probabilidad de quedar en cada grupo. Ni usted ni el investigador eligen el grupo. Puede recibir un placebo, que no contiene medicamento activo del estudio.",
  "pt-BR": "Você tem 50% de chance de entrar em cada grupo. Nem você nem o pesquisador escolhem o grupo. Você pode receber um placebo, que não contém medicamento ativo do estudo.",
  "hi-IN": "दोनों में से हर समूह में जाने की संभावना 50% है। समूह न आप चुनते हैं, न शोधकर्ता। आपको प्लेसीबो मिल सकता है, जिसमें अध्ययन की सक्रिय दवा नहीं होती।",
  "zh-CN": "分到每个组的机会都是 50%。您和研究人员都不能选择组别。您可能拿到安慰剂，它不含本研究的有效药物成分。",
};

export function normalizeSampleText(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[\p{P}\p{S}]/gu, " ").replace(/\s+/g, " ").trim();
}

export function sampleBridge(request: BridgeRequest, elapsedMs: number): BridgeResult {
  const locale = request.locale;
  if (!hasPreparedSamples(locale)) throw new BridgeServiceError("SAMPLE_LANGUAGE_UNAVAILABLE", "This language needs Gemini live; no prepared translation is available.", 422, false);
  const section = SECTIONS.find((item) => item.id === request.sectionId);
  if (request.mode === "conversation" && normalizeSampleText(request.text ?? "") !== normalizeSampleText(SAMPLE_CONVERSATION)) {
    throw new BridgeServiceError("SAMPLE_TEXT_UNAVAILABLE", "Sample mode contains one prewritten conversation. Load the sample conversation or enable the live engine to translate your own text.", 422, false);
  }
  if (request.mode === "consent" && !section) {
    throw new BridgeServiceError("INVALID_REQUEST", "Choose a known study section.", 400, false);
  }
  const sourceText = request.mode === "consent" ? section!.body : request.text!.trim();
  return {
    requestId: request.requestId,
    mode: request.mode,
    locale: request.locale,
    engine: "sample",
    studyVersion: STUDY.version,
    sourceText,
    sourceSectionIds: request.mode === "consent" ? [section!.id] : ["randomization"],
    translation: request.mode === "consent" ? (locale === "en-US" ? englishExplanations[section!.id] : translations[locale][section!.id]) : (locale === "en-US" ? "You have a 50% chance of being in each group. Neither you nor the researcher chooses your group. You may get a placebo: a tablet with no active study drug." : conversationTranslations[locale]),
    backTranslation: request.mode === "consent" ? section!.body : SAMPLE_CONVERSATION,
    flags: [
      { code: "SAMPLE_FIXTURE", severity: "info", message: "Prewritten sample translation and English rendering. No live AI or blind rendering call was made." },
      { code: "REVIEW_AID", severity: "info", message: "English rendering and checks are review aids, not proof of translation accuracy. Review the source before releasing." },
    ],
    visual: request.mode === "consent" ? section!.visual : "RANDOMIZATION",
    elapsedMs,
    canRelease: true,
  };
}
