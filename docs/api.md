# Bridge API contract

The TypeScript source of truth is `src/lib/types.ts`; the runtime validators are in `src/lib/bridge/schema.ts`. Requests are same-origin JSON sent to `POST /api/bridge`. Responses include `Cache-Control: no-store`. This prototype has no public authentication or clinical authorization system; deploy it only for a controlled synthetic-data demonstration.

## Request

```ts
type Locale = "tr-TR" | "es-419" | "pt-BR" | "hi-IN" | "zh-CN";
type BridgeMode = "consent" | "conversation";
type Engine = "live" | "sample";

interface BridgeRequest {
  requestId: string;
  mode: BridgeMode;
  locale: Locale;
  engine: Engine;
  sectionId?: string;
  text?: string;
}
```

For consent, supply a known `sectionId`: `purpose`, `randomization`, `procedures`, `risks`, `voluntary`, or `withdrawal`. The server resolves the source against its own fictional study fixture. For conversation, supply the reviewed English `text`. Generate a new `requestId` for a new request so a late response cannot replace a newer draft.

The strict request schema rejects unknown fields. A trimmed `requestId` must be 1–100 characters and contain only ASCII letters, digits, underscores, or hyphens. Conversation text is trimmed, required, and limited to 4,000 characters. Consent requests must omit `text`; conversation requests must omit `sectionId`.

The route also rejects a declared content length over 24,000 bytes or a decoded body over 24,000 characters before validating JSON.

```json
{
  "requestId": "demo-randomization-es-1",
  "mode": "consent",
  "locale": "es-419",
  "engine": "sample",
  "sectionId": "randomization"
}
```

The sample engine accepts only its fixed conversation text, documented in the README. It never generates a response for arbitrary conversation text or impersonates the live engine.

## Successful result

```ts
interface ReviewFlag {
  code: string;
  severity: "info" | "warning" | "blocking";
  message: string;
  sourceSnippet?: string;
}

interface BridgeResult {
  requestId: string;
  mode: BridgeMode;
  locale: Locale;
  engine: Engine;
  studyVersion: string;
  sourceText: string;
  sourceSectionIds: string[];
  translation: string;
  backTranslation: string;
  flags: ReviewFlag[];
  visual: "RANDOMIZATION" | "CALENDAR" | "DOCUMENT" | "NONE";
  elapsedMs: number;
  canRelease: boolean;
}
```

`engine` identifies the actual engine used. `sourceSectionIds` identifies fixture sections used as evidence; free conversation must not invent a section citation. `visual` selects a local visual, not an image-generation request. `elapsedMs` describes request processing time rather than a latency promise.

`canRelease` means the result meets the app's mechanical release conditions. It does not mean medically verified, approved by a clinician, reviewed by a translator, or already shown to the participant. The coordinator still must inspect the source, target explanation, back-translation, and flags and explicitly release the current draft. Blocking flags prevent release. A context change invalidates the draft and any previous release.

## Error result

```ts
interface BridgeError {
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
}
```

Errors use a non-success HTTP status and the structured envelope above. Clients should display `message`, use `retryable` to offer a retry, and never treat an error response as a successful draft. Do not infer a translation from an older result after the user changes its source or locale.

| HTTP status | Error code | `retryable` | Meaning |
| --- | --- | --- | --- |
| 400 | `INVALID_REQUEST` | `false` | Invalid JSON, request too large, or input outside the request schema |
| 422 | `SAMPLE_TEXT_UNAVAILABLE` | `false` | Conversation text does not match the fixed sample |
| 503 | `LIVE_UNAVAILABLE` | `false` | Missing server key or upstream authentication failure |
| 502 | `INVALID_MODEL_OUTPUT` | `true` | Missing/unreadable JSON or output outside the expected schema |
| 502 | `INVALID_REFERENCE` | `true` | Unknown, duplicate, or mismatched study-section references |
| 502 | `MODEL_INCOMPLETE` | `true` | The model response did not complete |
| 502 | `UPSTREAM_UNAVAILABLE` | `true` | Other failure while communicating with the live service |
| 429 | `RATE_LIMITED` | `true` | Upstream rate limit or exhausted quota |
| 504 | `REQUEST_TIMEOUT` | `true` | The overall live-request deadline expired |
| 499 | `REQUEST_CANCELLED` | `true` | The request was cancelled; the client may already have disconnected |
| 500 | `INTERNAL_ERROR` | `true` | An unclassified route failure |

`retryable: true` permits another attempt; it does not promise that retrying immediately will succeed. Configuration and sample-input errors require a change rather than an automatic retry.

Failure scenarios include invalid input, unknown sections/locales, a missing live API key, unsupported sample text, Gemini quota/rate limits, the overall 45-second deadline, network errors, and output that fails schema validation. A live failure must not quietly fall back to sample data. The route's duration allowance is 60 seconds; it is not a promise that every host permits the same duration.

## Live data flow

1. Validate the request and resolve source content.
2. Ask Gemini for a structured, simpler target-language explanation.
3. Validate the generated result.
4. In a separate stateless Gemini request, back-translate the target explanation without providing the original English source.
5. Apply review checks, return flags and release eligibility, and leave the result as a draft.

Each live request consumes two Gemini calls when both stages succeed. The calls share one overall time budget. The same model can make correlated mistakes in both calls; this pipeline is a review aid rather than independent professional linguistic validation.
