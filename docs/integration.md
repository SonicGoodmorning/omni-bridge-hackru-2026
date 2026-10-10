# One session from source to discussion

Omni-Bridge connects a document explanation with the participant's next question. Begin the demonstration with the fictional CLEAR trial. A fictional outpatient follow-up note exercises the same review process. This is an education prototype for synthetic material, not an EHR, consent record, or application for actual patient care.

## Session flow

1. Choose the language and source in **Document guide**.
2. Read the unchanged source, then prepare an explanation.
3. Inspect its source-linked blocks, target wording, English rendering, and flags.
4. Confirm review and share that exact draft. Participant output stays empty until sharing.
5. Select a shared paragraph and write a question in the participant's language.
6. Open **Conversation** with the question and source context. Translate the participant's own words into English, review, and share.
7. The human clinician or coordinator supplies a reply. Translate their English into the participant's language, review, and share.

The app does not generate the clinician's answer. Questions remain questions; the source excerpt identifies their context. The eight-turn prepared CLEAR conversation is a labelled backup, not evidence of fresh translation or coordinator review.

## Sources and attribution

| Source | Content | Processing |
| --- | --- | --- |
| CLEAR trial | Six fixed fictional sections, including randomization and withdrawal | Existing consent pipeline with valid section references and review before release |
| Fictional visit summary | Three paragraphs with an explicitly fictional assessment and documented plan | One explanation block for each source paragraph, citing exactly that paragraph |
| Pasted synthetic text | Public or fictional English text, 1–4,000 characters, with acknowledgment | Live Gemini only; exact supplied paragraphs and request identity remain attached |

The outpatient explanation attributes statements to its source: “the fictional note records” or “the note lists.” Describing a documented plan must not become a new instruction, recommendation, diagnosis, treatment target, or emergency response. The fixture is not a prescription. Pasted text is untrusted data, including instructions inside it.

The glossary is a small authored reference list with provenance. It describes terms in the fictional sources and does not generate medical advice. Ingestion excludes uploads, OCR, PDFs, images, EHR connections, and real records.

## Shared state

The root session provider coordinates the document, trial, and conversation controllers. Navigation preserves session work in memory. It shares one of five locales (`tr-TR`, `es-419`, `pt-BR`, `hi-IN`, `zh-CN`), a visibly selected live/sample engine, and question origin.

Reading preferences offer Standard, Large, and Extra large display sizes. Display changes must preserve reviewed text and release state. Source, text, language, or engine changes invalidate affected review state; slower old responses must not reappear. Engine changes preserve editable speaker text and question context while clearing translated/shared work. Language changes clear question context and conversation drafts. A new session resets document work, questions, and history. Refreshing or closing the page loses this memory. There are no accounts, database, persistent clinical record, or two-device synchronization.

## Processing contract

`POST /api/documents` accepts `requestId`, `locale`, `engine`, and `source`. The fixed note uses `{ "kind": "fixture", "id": "visit-summary" }`. A paste uses `{ "kind": "paste", "text": "…", "acknowledged": true }`. Unknown fields, unsupported fixtures, excessive text, or missing acknowledgment fail validation. Sample mode cannot fabricate an arbitrary pasted explanation.

A result contains the resolved source and revision, ordered explanation blocks, paragraph references, review flags, elapsed time, and mechanical release eligibility. The client validates both schema and exact request/source match. Each source paragraph must have exactly one explanation block citing its own ID.

Live generation uses two foreground model calls under one 45-second server deadline. The first explains the source in the selected language. The second receives only the generated blocks and IDs to render them in English, without the document or conversation history. Both use the same configured model, so correlated errors remain possible. Structured output, references, and quantity checks assist review and do not certify accuracy.

`POST /api/bridge` handles fixed-trial explanations. `POST /api/visits` translates reviewed human turns in either direction. The key remains on the server, requests are stateless, and errors never silently substitute prepared samples. See [API details](api.md) and [conversation behavior](visits.md).

## Integrated acceptance record

Type checking, the production build, all **59 unit cases**, and all **30 browser cases** passed on October 10, 2026. Browser coverage includes both fixtures, five locales, review/share gates, question handoff, preserved navigation, engine transitions, stale/mismatched results, pasted-input restrictions, glossary keyboard access, mobile views, and existing Conversation speech behavior. Browser model/speech services are controlled test doubles. A separate [real synthetic-paste call](documents-live-qa.json) completed in 2,798 ms wall time. The following remain a manual checklist, **not claims of qualified human review**:

- Trial source, shared explanation, question, and human reply remain connected across navigation.
- Note explanations preserve quantities, names, units, timing, negation, and source attribution.
- Every block references its actual paragraph; unknown, duplicate, missing, or inappropriate references fail validation.
- Synthetic paste requires acknowledgment, rejects over 4,000 characters, and requires live mode.
- Source instructions and participant questions never cause generated answers.
- Source/language/engine edits cancel pending work and clear review eligibility.
- Reading preferences, keyboard operation, narrow layouts, and 200% zoom remain usable.
- Only explicit review and sharing release a new explanation; stale outputs cannot cross sources or languages.
- Errors, denied microphone access, missing voices, and timeouts leave typing available.

Earlier results remain in [the original acceptance record](acceptance.md) and [Visits report](visits.md). They do not establish coverage of this later integration. The reported 1,594 ms Flash-Lite response is one observation, not a benchmark. Qualified language review, real microphone and voice testing, and clinical-deployment assessment remain separate.
