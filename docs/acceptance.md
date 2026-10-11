# Acceptance and human QA

Use synthetic material and consenting teammates. Mark manual checks only after observation. Automated tests, valid JSON, source links, and reverse rendering do not establish translation quality or clinical fitness.

Current submission evidence is in [the release record](submission-release.md). The historical counts and live timings below describe earlier revisions.

## Historical integrated build

| Check | Recorded result | Evidence |
| --- | --- | --- |
| Type checking | Passed | October 10, 2026; root implementation run |
| Unit suite | **59 passed** | October 10, 2026; root implementation run |
| Final integrated browser suite | **30 passed in 26.2 s** | 14 connected-document cases + 16 Conversation cases; mocked live/speech services |
| Current production build | Passed | Final integrated Next.js build, October 10, 2026 |
| Updated HTML deck | 11 slides checked, no screen/print overflow or visual clipping observed | October 10, 2026; keyboard navigation and visual contact-sheet inspection |
| Updated PDF | 11 pages exported and visually reviewed | Rendered contact sheet: no clipping or overlap observed |
| Integrated video and screenshots | Captured and visually reviewed | 160.68 s, 1440×960; three real live operations plus a labeled sample; updated desktop/mobile images |
| Unified hosted deployment | Vercel Preview READY; hosted build passed | [Integrated URL](https://express-monsoon-5gkbxhw-gs5nn2i3b-egegoodmorning-6248.vercel.app), encrypted server key, Flash-Lite, and existing Vercel authentication retained |
| Real microphone and browser voice | Pending | Mocked services do not establish real behavior |
| Qualified review in all five languages | Pending | No accuracy or clinical-validation claim |

The 59-unit run includes 19 new document cases in addition to the prior trial, visit, and reducer tests. Document coverage includes strict inputs/acknowledgment, five-language samples, source revisions and paragraph preservation, blind reverse rendering, exact block references, changed quantities/units, selected unsupported additions, attribution policy, sanitized failures, cancellation, and a shared deadline. These tests exercise controlled transports and deterministic checks; they do not measure model or clinical accuracy.

## Historical automated coverage

Before integration, a 40-case unit suite passed. A complete 25-browser run passed in 23.3 seconds, followed by a passing long-speech regression, yielding 26 observed cases: 16 Visits cases and 10 original-workspace cases. Their coverage included both directions, review/share gating, prepared samples, stale/mismatched responses, microphone language, denied permission, delayed callbacks, audio handoff, long transcripts, mobile layout, and navigation. Speech recognition and playback were simulated.

An earlier fresh GitHub clone passed `npm ci`, example-environment setup, type checking, all 25 then-existing unit tests, and production build. The earlier 11-slide deck and its PDF also passed visual review. These records establish those earlier versions only, not the current integration.

## Earlier live document observation

An acknowledged synthetic English paragraph completed the real two-call document path in Turkish: HTTP 200, 2,798 ms wall time, 2,658 ms server time. The returned text retained 4 visits, 8 weeks, voluntary participation, and leaving at any time. Its only flag was the review-aid notice. See [the raw document report](documents-live-qa.json). This one observation is not a benchmark or qualified translation review.

## Earlier recorded connected live journey

The earlier captioned video contained three HTTP 200 live operations: Turkish trial explanation (1,894 ms server time), participant question into English (1,303 ms), and the human-authored English reply into Turkish (1,597 ms). All produced mechanically releasable results; only review-aid notices were present. The video then explicitly switches to the fictional visit-note sample. [Actual responses](integrated-demo-qa.json) are separate from the mocked browser suite. The capture script operates review controls; this is not qualified human approval or evidence that every wording is accurate.

## Actual earlier live observations

All requests used synthetic text. The first Turkish randomization smoke check returned HTTP 200 in 6,385 ms. A separate 13-case trial run produced four successes and nine quota errors in [the original raw report](live-qa.json):

| Successful randomization locale | Server processing time | Result |
| --- | --- | --- |
| Turkish | 28,023 ms | HTTP 200; mechanically releasable |
| Spanish | 9,001 ms | HTTP 200; mechanically releasable |
| Brazilian Portuguese | 5,434 ms | HTTP 200; mechanically releasable |
| Hindi | 5,118 ms | HTTP 200; mechanically releasable |

That run's quota failures prevented live Mandarin, remaining-section, legacy English-conversation, contradiction, and unspecified-policy coverage. A quota error tests failure mapping, not the translation behavior it interrupted.

Two later Turkish Visits calls succeeded: clinician English to Turkish in 7,662 ms wall time and participant Turkish to English in 8,004 ms. The participant's question remained a question in English and the Turkish reverse rendering. See [the visit raw report](visits-live-qa.json).

After the project's `gemini-3.8-flash` allowance was exhausted, a two-call `gemini-3.5-flash-lite` participant question succeeded in 1,594 ms. The server default and encrypted Preview configuration now select Flash-Lite. This is one observation, not a benchmark or language validation. None of these earlier calls establishes live coverage of the new note/paste pipeline. See [the Visits account](visits.md#observed-validation) for the recorded model change.

## Integrated document and question flow

- [ ] Trial and note sources stay visibly fictional, unchanged, and identifiable.
- [ ] All six trial sections and all three note paragraphs have labelled samples in five locales without a key.
- [ ] Each note/paste explanation cites exactly its original paragraph and preserves the entire source.
- [ ] Paste requires public/fictional-source acknowledgment and 1–4,000 characters; Sample mode refuses arbitrary pasted content.
- [ ] Unknown, missing, duplicate, or mismatched paragraph references cannot become a released draft.
- [ ] A draft remains separate from participant output until explicit review and sharing.
- [ ] The participant can attach a question to a shared paragraph and carry that context to Conversation.
- [ ] The question stays editable and the app translates it without answering.
- [ ] A human coordinator supplies the reply, with the same review/share process in the reverse direction.
- [ ] Navigation preserves session work; refresh/new session clears it as documented.
- [ ] Display-size changes preserve reviewed wording and release state.
- [ ] Source/text/language/engine changes cancel or invalidate affected work; an old response cannot reappear.
- [ ] Glossary definitions cite their source and do not transfer a fixture plan into an unrelated paste.

## Conversation and speech

- [ ] Clinician English translates to the selected language, and participant text translates to English.
- [ ] The shared history contains only explicitly shared turns, except the clearly labelled full prepared fixture.
- [ ] All eight supported sample turns work; arbitrary sample messages fail honestly.
- [ ] Microphone recording starts only after a user action and uses the intended speaker language.
- [ ] Recognized words remain editable before translation.
- [ ] Long speech remains visible in full, including final negation; translation waits for deliberate shortening below the limit.
- [ ] A stopped/canceled recorder cannot append delayed words under another speaker or language.
- [ ] Recording and audio playback stop one another, with stale callbacks ignored.
- [ ] Missing voices, denied permission, and browser/network failures leave typing available.
- [ ] No duplicate turn appears after repeated share actions.
- [ ] Playback reads only shared text with a matching voice, after a click.

## Reliability and accessibility

- [ ] Empty/invalid inputs, missing key, quota errors, malformed output, canceled calls, and deadlines produce useful errors.
- [ ] A failed live call never silently falls back to a prepared example or revives an earlier draft.
- [ ] No key reaches browser payloads, bundles, committed files, or public captures.
- [ ] A 45-second total server budget applies across both calls.
- [ ] Pasted instructions remain untrusted source text.
- [ ] Keyboard navigation and visible focus reach all main actions.
- [ ] Large text, extra-large text, 200% zoom, and narrow screens keep content usable.
- [ ] Turkish, Hindi, and Simplified Chinese render without missing glyphs or clipping.
- [ ] Status and errors use words, not color alone.
- [ ] A fixed timeline or diagram appears only when the current source supports it.

## Planted critical facts

Label planted outputs as test alterations. Compare the known source with the alteration and record whether automatic checks, a human reviewer, or neither detected it. Do not invent a detection percentage.

| Source | Deliberate alteration | Review target | Observed manual result |
| --- | --- | --- | --- |
| 50% chance of either group | 100% or guaranteed active tablet | Probability and unsupported certainty | Pending |
| Neither person chooses | Researcher chooses the group | Assignment and negation | Pending |
| Placebo has no active study drug | Placebo contains active drug | Protected concept | Pending |
| 4 visits over 8 weeks | 8 visits over 4 weeks | Quantity relationships | Pending |
| About 60 minutes; 5 mL | 6 minutes; 5 mg or 50 mL | Units and amount | Pending |
| May leave without penalty | Must stay or pay a penalty | Withdrawal rights | Pending |
| Collected-data policy unspecified | All prior data will be deleted | Unsupported policy | Pending |
| Fictional note records 148/94 mmHg | Different pressure/unit | Measurement fidelity | Pending |
| Note lists 10 mg and 2-/4-week timing | Changed dose, timing, or missing medicine | Source attribution and quantities | Pending |
| Note states its documented plan | New target, symptom cause, or urgent instruction | Unsupported clinical addition | Pending |

Automatic checks can miss semantic changes or falsely flag equivalent wording. Human comparison of the target language with the original remains necessary.

## Human language review

| Locale | Trial | Note/paste | Both conversation directions | Reviewer / status |
| --- | --- | --- | --- | --- |
| Turkish | Pending | Pending | Pending | Pending |
| Latin American Spanish | Pending | Pending | Pending | Pending |
| Brazilian Portuguese | Pending | Pending | Pending | Pending |
| Hindi | Pending | Pending | Pending | Pending |
| Mandarin / Simplified Chinese | Pending | Pending | Pending | Pending |

Ask a fluent reviewer to compare the target text directly with the source, independently of the reverse rendering. Preserve respectful adult language, uncertainty, facts, units, negation, speaker identity, and source attribution. A teammate speaking Turkish does not establish certified medical translation review.

## Submission review

- [ ] Final clean setup and judge access work for this version.
- [ ] Repository contains MIT and excludes keys, private email screenshots, and patient information.
- [ ] Final capture includes an actual live segment or explicitly shows its error and labelled sample fallback.
- [ ] New PDF/video/screenshots describe the integrated version.
- [ ] AI-assistance provenance and the actual build timeline are accurate.
- [ ] One track, at most two superlatives, all teammates listed, and all required Devpost fields completed.
- [ ] Organizer confirmation resolves schedule, AI policy, and any pre-existing-work/cross-prize questions.

See [the verified requirements check](guidelines.md). Use 10 a.m. Eastern on Sunday, October 11 as the conservative build/submission cutoff and prepare for judging by 12:30 p.m. while confirming the conflicting notices on site.
