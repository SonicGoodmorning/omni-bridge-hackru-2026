# API contracts

The unified UI connects **Document guide**, **Conversation**, **Explain jargon**, patient profiles, numbers, visit history and action plans. Its server endpoints remain separate by input contract:

| Endpoint | Responsibility | Runtime validators |
| --- | --- | --- |
| `POST /api/bridge` | Fixed CLEAR trial explanation; retained legacy English-only explanation input | `src/lib/bridge/schema.ts` |
| `POST /api/documents` | Fictional follow-up note or acknowledged synthetic paste | `src/lib/documents/types.ts` |
| `POST /api/visits` | Faithful interpretation of one human turn; plain-English clinician wording when English is selected | `src/lib/visits/types.ts` |
| `POST /api/explain` | General medical vocabulary explanation; no patient profile or transcript mutation | Strict subset of `visitRequestSchema`; `visitResultSchema` output |

All requests are same-origin JSON. Unknown fields and unsupported locales fail validation. Responses include `Cache-Control: no-store`. There is no public authentication or clinical authorization system; the hosted Preview is access-protected for a controlled synthetic-data demonstration.

## Shared fields and limits

```ts
type Locale = "en-US" | "es-419" | "zh-CN" | "hi-IN" | "ar-SA" | "fr-FR" | "pt-BR" | "bn-BD"
  | "ru-RU" | "ur-PK" | "id-ID" | "de-DE" | "ja-JP" | "ko-KR" | "vi-VN" | "tr-TR";
type Engine = "live" | "sample";
interface ReviewFlag {
  code: string;
  severity: "info" | "warning" | "blocking";
  message: string;
  sourceSnippet?: string;
}
```

A request ID must contain 1–100 ASCII letters, digits, underscores, or hyphens. Bridge/Visits trim it first; Documents requires an already-clean ID. Generate a new ID for each request. Source/turn text is trimmed and must contain 1–4,000 characters where text input applies. The UI also limits its editable text and requires deliberate shortening of an overlong speech transcript.

Bridge, Documents and Visits reject declared and measured UTF-8 request bodies above 64,000 bytes. Explain jargon uses a 32,000-byte limit; Action plan uses its separate transcript/body limits below. Do not use the body cap as the source-text cap.

Every successful result stays a draft. `canRelease` indicates mechanical eligibility, not translation quality, clinical approval, human review, or completed sharing. Blocking flags prevent release. The client must validate the schema and current request/source/locale/engine/direction, inspect the output, and explicitly share. Edits invalidate affected review state.

## Fixed trial: /api/bridge

```ts
interface BridgeRequest {
  requestId: string;
  mode: "consent" | "conversation";
  locale: Locale;
  engine: Engine;
  sectionId?: string;
  text?: string;
}
```

Consent requests include a known section ID and omit `text`: `purpose`, `randomization`, `procedures`, `risks`, `voluntary`, or `withdrawal`. The server resolves its own fictional source. The retained `conversation` API mode includes reviewed English `text` and omits `sectionId`; the unified two-way Conversation UI uses `/api/visits` instead.

```json
{
  "requestId": "clear-randomization-tr-1",
  "mode": "consent",
  "locale": "tr-TR",
  "engine": "sample",
  "sectionId": "randomization"
}
```

A result contains `requestId`, `mode`, `locale`, `engine`, `studyVersion`, exact `sourceText`, `sourceSectionIds`, `translation`, `backTranslation`, `flags`, `visual`, `elapsedMs`, and `canRelease`. Section references must belong to the fixed fixture. A consent explanation references exactly its selected section. Free input must not invent a source citation. `visual` is a local enum: `RANDOMIZATION`, `CALENDAR`, `DOCUMENT`, or `NONE`.

Sample conversation accepts only this fixed utterance:

> You have a 50% chance of being assigned to either group. Neither you nor the researcher chooses the group. You may receive a placebo, which has no active study drug.

It never fabricates a sample for arbitrary English input.

## Source-linked document: /api/documents

```ts
type DocumentInput =
  | { kind: "fixture"; id: "visit-summary" }
  | { kind: "paste"; text: string; acknowledged: true };

interface DocumentRequest {
  requestId: string;
  locale: Locale;
  engine: Engine;
  source: DocumentInput;
}
```

The fixture is a three-paragraph fictional outpatient follow-up summary. The fixed trial continues through Bridge. Pasted public or fictional English requires the literal acknowledgment `true` and live mode. Unknown fixture IDs, missing/false acknowledgment, excessive text, wrong locale, or extra source fields fail validation. A structurally valid paste in Sample mode returns `422 SAMPLE_TEXT_UNAVAILABLE`; the UI also refuses to generate it locally.

```json
{
  "requestId": "note-tr-1",
  "locale": "tr-TR",
  "engine": "sample",
  "source": { "kind": "fixture", "id": "visit-summary" }
}
```

```ts
interface DocumentSource {
  id: string;
  revision: string;
  title: string;
  provenance: "fictional-fixture" | "synthetic-paste";
  paragraphs: { id: string; title: string; text: string }[];
}
interface DocumentResult {
  requestId: string;
  locale: Locale;
  engine: Engine;
  source: DocumentSource;
  blocks: {
    id: string;
    sourceParagraphIds: string[];
    translation: string;
    backTranslation: string;
  }[];
  flags: ReviewFlag[];
  elapsedMs: number;
  canRelease: boolean;
}
```

Each explanation block must use its original paragraph ID and cite exactly that same ID once. Every paragraph must have one block; unknown, missing, or duplicate blocks fail. The engine returns blocks in source order. The client compares the entire resolved source with its current request, including revision and paragraph content.

Synthetic paste splits at blank lines. If it contains more than 20 paragraphs, the remaining content joins into the twentieth; no supplied content is silently dropped. A paste revision identifies text changes and is not a cryptographic security hash.

The first live call explains all paragraphs with source attribution. The second renders the generated blocks back into English using their IDs. Statements about a fictional documented plan must remain attributed to the note, preserve facts, and avoid new clinical advice. Review checks cover selected quantities, terms, units, negation, and unsupported additions; they are incomplete aids.

## Human turn: /api/visits

```ts
interface VisitRequest {
  requestId: string;
  locale: Locale;
  engine: Engine;
  speaker: "clinician" | "participant";
  text: string;
}
```

The server derives direction: clinician English (`en-US`) to the selected locale; participant selected locale to English. Clients cannot supply independent source/target languages. The current reviewed turn is the translation input. The participant's attached source question context remains an interface reference and is not an instruction to generate a medical answer.

A result contains `requestId`, `locale`, `engine`, `speaker`, exact trimmed `sourceText`, `sourceLanguage`, `targetLanguage`, `translation`, `reverseTranslation`, `flags`, `elapsedMs`, and `canRelease`. Both language codes must match the speaker direction. The client also matches source text and request context before showing a draft.

Sample mode recognizes only the eight prepared utterances in the matching speaker and locale. **Open prepared conversation** loads labelled UI fixtures without pretending that calls or individual review occurred. Arbitrary messages require live mode. No endpoint generates a reply on behalf of a person.

## Errors

```ts
interface ErrorResult {
  error: { code: string; message: string; retryable: boolean };
}
```

| HTTP | Code | Retryable | Meaning |
| --- | --- | --- | --- |
| 400 | `INVALID_REQUEST` | No | Malformed/oversized JSON, unsupported input, or failed schema |
| 422 | `SAMPLE_TEXT_UNAVAILABLE` | No | Arbitrary sample turn or pasted sample document |
| 503 | `LIVE_UNAVAILABLE` | No | Missing key or failed upstream authentication |
| 502 | `INVALID_MODEL_OUTPUT` | Yes | Missing/invalid output, or invalid document block mapping |
| 502 | `INVALID_REFERENCE` | Yes | Invalid fixed-trial section references |
| 502 | `MODEL_INCOMPLETE` | Yes | Model response did not complete |
| 502 | `UPSTREAM_UNAVAILABLE` | Yes | Other live-service failure |
| 429 | `RATE_LIMITED` | Yes | Rate limit or exhausted quota |
| 504 | `REQUEST_TIMEOUT` | Yes | Overall deadline expired |
| 499 | `REQUEST_CANCELLED` | Yes | Request canceled, possibly after client disconnect |
| 500 | `INTERNAL_ERROR` | Yes | Unclassified route failure |

Display the safe message and leave sharing disabled. Retry eligibility does not mean an immediate retry will succeed. Sample/configuration errors need a deliberate change. A failed live request must never silently fall back to fixtures or revive an older draft.

## Live processing

Each complete operation uses two stateless Gemini calls with `store: false` under one 45-second overall budget. Route duration is configured to 60 seconds, with a 46-second client deadline. The server key and configurable model ID stay server-side; the current default and Preview setting use `gemini-3.5-flash-lite`.

The fresh reverse request receives only generated text, required identifiers, and language direction, without original source or history. Both calls use the same model and can share an error. Source data, including instructions in pasted text, must not override the model's task. Schema validation and flags do not establish medical or linguistic validity.

## Patient context and action plans

The existing bridge, documents and visits request schemas accept an optional `patientContext`. It contains bounded self-reported age group, individually chosen familiar foods, food access, cooking, work schedule, activity, diet/preferences/restrictions, helpful examples or topics to avoid, conditions, medicines, allergies, communication needs, routine, support needs, and the chosen-example toggle. The browser sends it only after the patient enables AI context. Display nickname, pronouns, stored preferred language, exact age, sex, height, weight, location, identity/background fields, profile/sample IDs and logged numbers are excluded; the request locale remains authoritative. Legacy `culturalBackground` and `region` request fields are accepted for compatibility but stripped during validation before any Gemini request. Sample engines do not personalize prepared text.

`POST /api/action-plan` accepts `{requestId, locale, turns, patientContext?}`. `turns` are the existing shared conversation turn objects, with unique IDs and speaker/language direction matching the locale. Limits: 1–100 turns, 4,000 source characters per turn, 100,000 combined source/translation characters, and a 500,000-byte request body. A clinician turn is required. Exceeding a limit fails explicitly without truncation.

The server always uses live Gemini. It sends every clinician original and every participant original/English rendering; clinician translations and cultural examples do not become prescription evidence. A second independent call receives only patient-language action/timing/clarification text and questions. Compact model schemas avoid upstream schema-complexity rejection; complete Zod schemas still validate returned values on the server.

The result includes `actions`, bilingual `questions`, `sourceTurnIds`, locale, request ID, creation timestamp and elapsed time. Each action has a clinician source ID, verbatim source quote expanded to its containing complete sentences, kind, English/patient wording and timing, recurrence (`daily`, `once`, `as-directed`), clarification fields, medication fields, English reverse renderings, flags and `canCheck`. Non-medication entries have empty medication fields. Unknown medication identity, dose, route or timing blocks a step. Quantity/negation checks, possible medication misclassification and unsupported daily recurrence can also block it. Missing timing never becomes an invented schedule. Any blocked action pauses activation of the whole checklist.

The client requires explicit source review before checklist use. It rejects mismatched responses and invalidates the active plan on transcript/language/context changes. Optional browser persistence stores the reviewed result and completion keys plus a SHA-256 fingerprint of the generating transcript, locale and AI context, rather than another copy of the full profile. Restoration requires that fingerprint to match and requires review again. Source quotes and plan text remain unencrypted local data.

Errors use the existing `{error:{code,message,retryable}}` shape. Missing configuration, quota, cancellation, timeout, invalid output, bad references and incomplete extraction leave the transcript available and never substitute a prepared plan.

## General vocabulary: /api/explain

Send exactly `{ requestId, locale, text }`. Text is an English term, sentence, or meaning question, trimmed to 1–4,000 characters. No engine, speaker, patient context, or conversation is accepted. The route selects live Gemini and its own vocabulary policy on the server. Missing configuration returns 503; invalid input returns 400.

The response uses `VisitResult` (`speaker: "clinician"` is a schema reuse detail, **not clinician authorship**), with `sourceLanguage: "en-US"`, the requested target language, a general `translation` explanation, independent English `reverseTranslation`, and review flags including `GENERAL_EXPLANATION`. It answers general meaning questions; Conversation still preserves a patient's question for a human response. No automatic sharing, transcript saving, plan extraction, or personal diagnosis occurs. Client edits, language changes, new sessions and navigation cancel/invalidate pending answers.

Prepared samples in Bridge/Documents/Visits support only English, Turkish, Spanish, Portuguese, Hindi, and Mandarin. Other valid locales with `engine: "sample"` return `422 SAMPLE_LANGUAGE_UNAVAILABLE`. English clinician interpretation explicitly simplifies jargon; English participant interpretation faithfully preserves questions.
