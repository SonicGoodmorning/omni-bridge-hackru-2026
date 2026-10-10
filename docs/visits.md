# Two-way visit conversations

Visits is a turn-based bilingual conversation workspace for a synthetic study-visit demonstration. A clinician or research coordinator speaks English; a participant responds in the selected language. Both sides can type instead of using a microphone.

The workspace translates each person's own words. It does not generate an answer on behalf of either person, offer medical advice, diagnose symptoms, or create a care plan. Use fictional or public material while demonstrating it.

## One turn at a time

1. Choose the participant's language and select who is speaking.
2. Type a message, or start the microphone and stop when the turn is complete. Review and correct the recognized text before sending it.
3. Prepare the translation. The clinician's English is translated into the participant's language; the participant's words are translated into English.
4. Inspect the translated draft and the separate rendering back into the speaker's language. These are review aids, not a translation-accuracy certificate.
5. Confirm review and explicitly share the exact draft. Only shared turns belong in the bilingual conversation history.

Editing either speaker's unshared text clears the current draft and its review state while preserving earlier shared turns. Changing the participant language or engine starts a clean conversation so earlier translations cannot be mistaken for the new settings. A canceled or outdated request must never become a newly shareable turn. Starting a new visit clears both composers and the session history.

## Prepared examples and live translation

Prepared examples make the two directions demonstrable without a Gemini key. They use fixed, labelled sample text; they are not live translations and have not received qualified language review.

- **Use next sample turn** fills one speaker's composer with the next of eight alternating fictional turns. Translation, review, and sharing remain explicit actions.
- **Open prepared conversation** displays the complete eight-turn fixture immediately. Those turns are marked as prepared examples; opening them is not a record that a coordinator reviewed a translation.
- **Sample mode** accepts only the supplied example utterances in their matching language and speaker direction. Arbitrary messages require live Gemini.

Live mode sends the current reviewed turn to the server for Gemini translation. A failed live call stays an error; it never silently returns a prepared example. Neither mode automatically continues the conversation or answers a participant's question.

The same five participant languages are available: Turkish, Latin American Spanish, Brazilian Portuguese, Hindi, and Mandarin using Simplified Chinese. Locale selection also sets the participant microphone's recognition language. Browser language and voice availability can differ, so the typed path is always necessary.

Speech longer than 4,000 characters stays visible in full, including its final words. Translation is disabled until the speaker deliberately shortens the editable draft; the app does not silently truncate a long recording.

**Listen** reads the shared translation only after a click and only when a matching browser voice is available. It does not play unshared drafts. Starting a recording stops playback, and starting playback stops recording. If a suitable voice is missing, the translated text remains available.

## Review and privacy limits

Live translation uses two stateless model calls: first a translation of the current turn, then a fresh rendering of only that generated text into the original speaker's language. The second call does not receive the source message or the visit history. Using the same model twice can reproduce the same misunderstanding, and a plausible back-rendering does not prove fidelity.

Preserve questions, uncertainty, negation, quantities, and the identity of the speaker. A participant's question should remain a question. A translator must not convert it into an answer or infer a diagnosis from it. Review flags can direct attention to possible changes; they do not detect every error.

Quantity checks compare numeric digits and a limited set of written English numbers from zero through ninety-nine, including compound forms such as “twenty-five.” They are not a complete number parser. Native-language quantities written out in words, subtle unit changes, and other meaning changes still require human inspection.

The session history is a temporary interface feature, not a clinical record, verified consent, or an authenticated audit trail. Do not enter real patient identifiers or protected health information. Live text goes to Gemini, and browser speech recognition may use the browser vendor's remote service. Browser support, microphone permission, network access, and installed voices affect speech features.

## API contract

`POST /api/visits` accepts a JSON object with `requestId`, `locale`, `engine` (`live` or `sample`), `speaker` (`clinician` or `participant`), and `text` (1–4,000 characters). Unknown fields and unsupported locales are rejected. The server derives the direction from the speaker: clinician `en-US` → selected locale, participant selected locale → `en-US`.

A successful response contains the request identity, locale, engine, speaker, exact trimmed `sourceText`, `sourceLanguage`, `targetLanguage`, `translation`, `reverseTranslation`, `flags`, `elapsedMs`, and `canRelease`. The client validates the schema and matches the active request and source before displaying a draft. Blocking review flags keep sharing disabled. A successful response does not share a turn automatically.

Errors use `{ "error": { "code": "…", "message": "…", "retryable": false } }` (the retryable value varies), with 400 for malformed requests or an oversized body, 422 for an unsupported sample utterance, 429 for rate limits, 503 for unavailable live configuration, 504 for deadlines, and 502 for invalid model output or upstream failure. Canceled requests use 499; unexpected internal failures use 500. Responses use `Cache-Control: no-store`. Neither route output nor session history is a persistent database record.

## Observed validation

On October 10, 2026, all 25 browser cases in the complete suite passed in 23.3 seconds. The subsequently added long-speech regression also passed in 1.8 seconds, bringing the recorded browser coverage to 26 cases: 16 Visits cases and 10 original-workspace cases. Speech recognition and playback use test doubles; no real microphone or voice service was exercised by those checks. The final unit suite contains 40 passing cases, including visit direction, blind reverse rendering, response validation, deadlines, errors, and limited quantity checks.

Visit browser checks cover both translation directions and the review gate, labelled prepared conversations in all five languages, arbitrary-input rejection in Sample mode, stale responses after source/language changes, queued speech after reset or speaker handoff, microphone language choice, denied permission with typed fallback, malformed and mismatched responses, explicit audio handoff, retained long transcripts, mobile overflow, and navigation from the original workspace.

Local live Gemini smoke checks completed in both Turkish directions on October 10, 2026: clinician English → Turkish in 7,662 ms wall time and participant Turkish → English in 8,004 ms. The participant question “Bu çalışmaya katılmak zorunda mıyım?” remained a question: “Do I have to participate in this study?” The separate Turkish reverse rendering also remained a question. See the [synthetic live report](visits-live-qa.json) for the exact requests and outputs.

Those two successful calls do not establish live coverage in all five languages or qualified translation accuracy. Real microphone recognition, real browser-voice playback, fluent human review in each language, and clinical deployment assessment remain separate from automated browser and schema checks. The original [acceptance record](acceptance.md) records the earlier consent/conversation implementation.

### Flash-Lite configuration update

Later on October 10, the Gemini API reported that this project's `gemini-3.8-flash` free-tier allowance of 20 requests per day was exhausted. A two-call live test using `gemini-3.5-flash-lite` succeeded in 1,594 ms: “Bu kurgusal çalışmaya katılmak zorunda mıyım?” became “Do I have to participate in this fictional study?” and reversed to the original Turkish. The server default and configured Preview model now use Flash-Lite. This is one observed latency result, not a benchmark or language validation. All 40 unit tests passed after the configuration change.

The API response did not expose Flash-Lite's daily allowance. Check the project's active model quotas in [AI Studio](https://ai.dev/rate-limit); model limits vary by project and tier. Each complete live turn still consumes two model calls, and the app does not automatically rotate models after quota errors.
