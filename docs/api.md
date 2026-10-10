# API contracts

The unified UI has **Document guide** and **Conversation**. Its server endpoints remain separate by input contract:

| Endpoint | Responsibility | Runtime validators |
| --- | --- | --- |
| `POST /api/bridge` | Fixed CLEAR trial explanation; retained legacy English-only explanation input | `src/lib/bridge/schema.ts` |
| `POST /api/documents` | Fictional follow-up note or acknowledged synthetic paste | `src/lib/documents/types.ts` |
| `POST /api/visits` | Faithful translation of one human turn in either direction | `src/lib/visits/types.ts` |

All requests are same-origin JSON. Unknown fields and unsupported locales fail validation. Responses include `Cache-Control: no-store`. There is no public authentication or clinical authorization system; the hosted Preview is access-protected for a controlled synthetic-data demonstration.

## Shared fields and limits

```ts
type Locale = "tr-TR" | "es-419" | "pt-BR" | "hi-IN" | "zh-CN";
type Engine = "live" | "sample";
interface ReviewFlag {
  code: string;
  severity: "info" | "warning" | "blocking";
  message: string;
  sourceSnippet?: string;
}
```

A request ID must contain 1–100 ASCII letters, digits, underscores, or hyphens. Bridge/Visits trim it first; Documents requires an already-clean ID. Generate a new ID for each request. Source/turn text is trimmed and must contain 1–4,000 characters where text input applies. The UI also limits its editable text and requires deliberate shortening of an overlong speech transcript.

Routes reject declared content lengths above 24,000 bytes. Documents and Visits also measure the decoded body's UTF-8 byte length against 24,000; the retained Bridge route checks its decoded character length. Do not use the body cap as the source-text cap.

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
