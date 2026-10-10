# Two-way Conversation

The **Conversation** workspace at `/visits` shares the same session as **Document guide**. A clinician or coordinator speaks English; a participant speaks the selected language. Either person can type. Questions and answers come from the humans, and the app translates their own words without generating a clinical response.

## From a document question

After reviewing and sharing a document explanation, the participant can select a paragraph and write a question in their language. **Discuss in Conversation** carries the editable question into the participant composer and keeps its source title, paragraph ID, and excerpt visible. Return to source leads back to the relevant document.

This context supports human discussion. It is not additional authority to answer the question, infer a diagnosis, or invent a plan. The current turn alone goes to the translator; the source reference remains available in the interface.

The root session shares language, engine, document work, question context, reading preferences, and conversation state across navigation. Text-size changes preserve the reviewed wording. New session resets the work; refresh or closing the page loses the in-memory session. There are no accounts, database, or two-device synchronization.

## One turn at a time

1. Type a message, or record a short turn in the correct speaker pane.
2. Stop recording and correct the recognized words.
3. Translate: clinician English into the participant language, or participant words into English.
4. Inspect the original, translation, separate reverse rendering, and flags.
5. Confirm review and share the exact draft into the bilingual history.

Editing either unshared draft clears the current translation/review state while preserving earlier shared turns. Language changes clear drafts, shared history, and question context. Engine changes invalidate translations and shared history while keeping editable speaker text and question context, so a prepared-source question can continue into a live exchange. Selecting a different source or resetting clears session work as documented. Canceled or outdated requests cannot become newly shareable turns.

The participant's controls include native-language wording. The clinician's controls remain in English. The five languages are Turkish, Latin American Spanish, Brazilian Portuguese, Hindi, and Mandarin with Simplified Chinese.

## Prepared examples and live translation

- **Use next sample turn** fills the next of eight alternating fictional CLEAR utterances. Translation, review, and sharing remain explicit.
- **Open prepared conversation** loads the complete fixture and labels it as prepared, without implying live calls or individual review.
- **Sample mode** accepts only those utterances in the matching speaker/language direction. Arbitrary input requires live Gemini.

Live mode sends the reviewed turn to the server. A failed call remains an error and never silently becomes a sample. Neither engine automatically continues the conversation or supplies an answer. Changing engines requires fresh translation and review, while keeping the editable question and its source reference.

## Speech and playback

Recognition starts only after a click and browser permission. Clinician speech uses `en-US`; participant speech uses `tr-TR`, `es-MX`, `pt-BR`, `hi-IN`, or `zh-CN`. The browser may use a remote recognition service, and support varies. Typed input always remains available.

Only one recorder is active. Recording locks the composers until final recognized words arrive or the recording is canceled. Role/language/reset changes detach old callbacks. Speech exceeding 4,000 characters stays visible in full, including final words; translation waits for deliberate shortening rather than silently truncating it.

**Listen** reads only a shared translation after a click and only if a matching browser voice exists. Starting recording stops playback, and playback stops recording. Missing voices leave text available. Generation guards prevent canceled utterance callbacks from stopping a later playback.

## Review limits and privacy

Each live turn uses two stateless calls: faithful translation, followed by a fresh rendering of only the target text back into the original language. The second call receives neither original source nor history. Both use the same model and can repeat a misunderstanding.

Preserve questions, uncertainty, negation, quantities, and speaker identity. A participant question must remain a question. Flags can miss semantic changes and do not certify accuracy. Numeric checks normalize selected digit forms and a limited set of English number words; native written-out quantities and subtle unit relationships still require human inspection.

This is a synthetic education prototype, not a clinical record, authenticated approval, verified consent, or replacement for an interpreter. Do not enter patient identifiers or protected health information. Live text goes to Gemini; browser speech may go to the browser vendor's service.

## API

`POST /api/visits` accepts `requestId`, `locale`, `engine`, `speaker`, and reviewed `text` of 1–4,000 trimmed characters. Unknown fields and unsupported locales fail validation. The server derives direction from `speaker`; callers cannot supply independent language codes.

The result contains exact `sourceText`, `sourceLanguage`, `targetLanguage`, `translation`, `reverseTranslation`, `flags`, `elapsedMs`, `canRelease`, and request identity. The client validates schema, language direction, source, and current request before showing a draft. Blocking flags disable sharing, and a successful response never shares automatically.

Errors use the common structured envelope and `Cache-Control: no-store`. Malformed input returns 400, unsupported sample text 422, unavailable live configuration 503, quota 429, deadlines 504, model/upstream failures 502, cancellation 499, and unexpected failures 500. See [the full contracts](api.md).

## Observed validation

The unified application passed type checking, production build, **59 unit tests and 30 browser tests** on October 10, 2026. The browser suite includes all 16 Conversation checks and 14 connected-document checks. Its speech/model services are controlled test doubles. The updated [capture](demo.webm) independently shows actual live Turkish question and English reply translations; [their returned JSON](integrated-demo-qa.json) records 1,303 ms and 1,597 ms server times. These observations are not benchmarks or qualified language review.

Historically, the earlier Visits build passed 40 unit cases and 26 observed browser cases: a complete 25-case run in 23.3 seconds, followed by a 1.8-second passing long-speech regression. Sixteen cases covered Visits and ten covered the original workspace. They exercised direction, release gating, prepared samples, arbitrary sample rejection, stale/mismatched responses, speaker language, delayed callbacks, audio handoff, long speech, mobile layout, and navigation. Speech and voice services were mocked. Those earlier results do not certify the later document/question integration.

Actual local live checks succeeded in both Turkish directions on October 10: clinician English to Turkish in 7,662 ms wall time and participant Turkish to English in 8,004 ms. “Bu çalışmaya katılmak zorunda mıyım?” remained the question “Do I have to participate in this study?” and reversed as a question. [The raw report](visits-live-qa.json) contains exact requests/results. These calls do not establish all-language coverage or translation accuracy.

### Model configuration observation

Later that day, the API reported the project's `gemini-3.8-flash` free-tier allowance of 20 requests/day was exhausted. A two-call `gemini-3.5-flash-lite` test completed in 1,594 ms: “Bu kurgusal çalışmaya katılmak zorunda mıyım?” became “Do I have to participate in this fictional study?” and reversed to Turkish. This is one observation, not a benchmark. The default and encrypted Preview configuration now use Flash-Lite.

That response did not expose Flash-Lite's daily allowance. Check the project's current quotas in [AI Studio](https://ai.dev/rate-limit); limits depend on account/model/tier. Each completed turn consumes two calls, and the app does not automatically rotate models after errors.

Qualified review in all five languages, real microphone recognition, real voice playback, and clinical-deployment assessment remain pending. None is established by mocked browser tests or plausible reverse rendering.
