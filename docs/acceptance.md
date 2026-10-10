# Acceptance and human QA

Use synthetic data and consenting teammates. Check a box only after the test is observed. Automated checks and schema validation do not establish translation quality or clinical fitness.

## Run record

| Check | Result | Date / reviewer / evidence |
| --- | --- | --- |
| `npm run typecheck` | Passed | October 10, 2026; implementation run reported by the root agent |
| `npm test` | 25 unit tests passed | October 10, 2026; implementation run reported by the root agent |
| `npm run build` | Passed | October 10, 2026; production build reported by the root agent |
| `npm run test:e2e` | 10 browser tests passed | October 10, 2026; implementation run reported by the root agent |
| HTML presentation layout | 11 slides checked; no overflow observed | October 10, 2026; browser review reported by the root agent |
| Exported PDF visual review | All 11 rendered pages checked; no clipping or overlap observed | October 10, 2026; PDF rendered-page inspection after print-layout correction |
| Clean setup with README | Passed | October 10, 2026; fresh GitHub clone, `npm ci`, example environment copied, type checking, 25 unit tests, and production build; reported by the root agent |
| Type checking from a fresh clone | Passed | October 10, 2026; `next typegen` then `tsc --noEmit`, reported by the root agent |
| Browser consent and conversation walkthrough | Not recorded | |
| Live Turkish randomization smoke check | HTTP 200; 6,385 ms; `canRelease: true` | October 10, 2026; one development request reported by the root agent |

The live smoke result demonstrates that the configured pipeline returned a mechanically releasable response. It does not establish translation quality, completed Turkish review, typical latency, or clinical validity.

### Observed automated and live coverage

The 10 browser tests cover the review/release gate, language and source invalidation, stale requests, five-language sample visit facts, fixed conversation input, rejected arbitrary sample text, API-error and malformed-output handling, narrow-screen layout, request validation, and ignored late speech callbacks after reset or mode changes. Microphone denial and transcript finalization use simulated browser recognition classes; they do not test a real microphone or speech-service accuracy. The manual checklist below intentionally remains pending.

A separate live run attempted 13 cases using synthetic text. [The raw request/result report](live-qa.json) contains four successful randomization responses and nine `429 RATE_LIMITED` failures:

| Successful live randomization locale | Server `elapsedMs` | Result |
| --- | --- | --- |
| Turkish `tr-TR` | 28,023 | HTTP 200; `canRelease: true` |
| Spanish `es-419` | 9,001 | HTTP 200; `canRelease: true` |
| Portuguese `pt-BR` | 5,434 | HTTP 200; `canRelease: true` |
| Hindi `hi-IN` | 5,118 | HTTP 200; `canRelease: true` |

For these four successful requests only, the median server processing time was 7,217.5 ms and the range was approximately 5.1–28.0 seconds. This small, quota-limited run is not a performance benchmark. The earlier 6,385 ms Turkish smoke result is separate and is not included in that four-request statistic.

Quota prevented successful live coverage of Mandarin randomization, the other five consent sections, the typed conversation, a contradictory conversation, and the unspecified collected-data-policy question. Their nine quota errors verify visible upstream failure mapping, not the translation or review behavior those cases were meant to exercise. Live conversation coverage, real microphone testing, and qualified review of every target language remain pending.

## Both modes and release gate

- [ ] Each of the six consent sections retains its original English source and `DEMO-1.0` version.
- [ ] Each section produces an explicitly labelled sample draft in all five locales, without an API key.
- [ ] Conversation supports the fixed sample text without a key; other sample text receives an honest error rather than fabricated output.
- [ ] A draft is visible to the coordinator before it is released to the participant view.
- [ ] Release requires the coordinator's explicit action. A blocking flag disables release.
- [ ] A released result matches the current source, mode, locale, and request identity.
- [ ] Editing the transcript, changing locale, switching sections/modes, or resetting clears old draft/release eligibility as appropriate.
- [ ] A slower old response cannot overwrite a newer request or appear under another locale.
- [ ] Empty input, invalid locale, and unknown section return useful errors and cannot release a result.
- [ ] Repeated send/release actions do not duplicate transcript content or leak old output.
- [ ] Local visuals correspond to the source and do not imply diagnosis or a confirmed treatment outcome.

## Speech and accessibility

- [ ] Speech starts only after the user's action and browser permission.
- [ ] Recognition produces a reviewable transcript; the user can correct it before sending.
- [ ] Denied microphone permission, unsupported browser recognition, unavailable microphone, and speech-service failure show a useful status while typed input works.
- [ ] Stopping recognition and resetting leave no unnoticed recording/listening state.
- [ ] Keyboard navigation reaches modes, sections, language, text entry, send, and release; focus is visible.
- [ ] The participant pane remains readable on a narrow display and at 200% zoom.
- [ ] Turkish characters, Hindi and simplified Chinese render without missing glyphs or clipped lines.
- [ ] Loading and errors have text labels, not color alone.

## Live engine and failure recovery

- [ ] A live request uses the server key and visibly identifies the live engine.
- [ ] No API key is present in client bundles, request payloads, browser UI, or committed files.
- [ ] A missing key produces a visible live-engine error; it never silently substitutes sample output.
- [ ] A rate-limit / quota response (including HTTP 429 upstream) leaves no new releasable draft and offers retry only when appropriate.
- [ ] A simulated delay exceeding the 45-second overall budget produces a timeout error and returns control to the user.
- [ ] Invalid JSON / invalid structured output is rejected and never reaches the participant view.
- [ ] A failed retry cannot re-release an older draft under new source text.
- [ ] Source text containing instructions to ignore the task is treated as quoted content, not as model authority.
- [ ] Questions about the unspecified collected-data policy remain unanswered by the fixture and are directed to the study team.

## Planted errors and critical facts

Use good examples and intentionally altered outputs with a known answer key. Test the check functions directly where available. A manual or test-only alteration is not a model result and must be labelled accordingly in the demo. Record missed errors as limitations; never report an accuracy percentage without a documented denominator.

| Source fact | Planted error | Expected review outcome | Observed result |
| --- | --- | --- | --- |
| 50% chance of either group | 100% or guaranteed investigational tablet | Flag the changed probability or meaning; coordinator must not release | |
| Neither participant nor researcher chooses | Researcher chooses your group | Flag lost negation/changed assignment; coordinator must not release | |
| Placebo has no active study drug | Placebo contains the active drug | Flag changed meaning; coordinator must not release | |
| 4 visits over 8 weeks | 8 visits over 4 weeks | Flag changed numbers/relationships; coordinator must not release | |
| Approximately 60 minutes | Approximately 6 minutes | Flag altered duration; coordinator must not release | |
| 5 mL blood sample | 5 mg blood sample or 50 mL | Flag unit/quantity change; coordinator must not release | |
| Benefit is not guaranteed | You will improve | Flag unsupported certainty; coordinator must not release | |
| May leave at any time without penalty | May not leave / must pay a penalty | Flag changed withdrawal rights; coordinator must not release | |
| Collected-data policy unspecified | All prior data will be deleted | Flag unsupported policy; coordinator must not release | |
| No applicable visual | Unsupported visual value | Schema validation rejects output | |

Some meaning changes require human judgment and may evade automatic checks. Distinguish which failures the automated layer detected from which the reviewer detected.

## Human language review

Every language below is pending qualified human review. Turkish team review is also pending; a teammate speaking a language does not by itself constitute medical translation certification.

| Locale | Reviewer | Six consent sections | Fixed conversation | Numbers, units, negation and rights | Status |
| --- | --- | --- | --- | --- | --- |
| Turkish `tr-TR` | Pending | Pending | Pending | Pending | Pending |
| Spanish `es-419` | Pending | Pending | Pending | Pending | Pending |
| Portuguese `pt-BR` | Pending | Pending | Pending | Pending | Pending |
| Hindi `hi-IN` | Pending | Pending | Pending | Pending | Pending |
| Mandarin / simplified Chinese `zh-CN` | Pending | Pending | Pending | Pending | Pending |

For each locale, ask a fluent reviewer to compare the target explanation with the source directly, independent of the back-translation. Check natural adult language, preserved uncertainty, accurate placebo/randomization meaning, unchanged numbers and units, and voluntary participation/withdrawal rights. Record corrections and rerun the affected scenarios. Do not mark a locale reviewed on the strength of model self-assessment.

## Submission review

- [ ] README setup works from a clean clone.
- [ ] Repository contains the MIT license and excludes secrets and personal data.
- [ ] Slides and narration accurately distinguish sample output from live Gemini calls.
- [ ] Slides contain no invented performance, patient outcome, clinical validation, or completed language-review claim.
- [ ] Record the actual demo video; the HTML deck is not a video.
- [ ] Confirm current organizer submission fields, prize selection, and deadline before submitting.
