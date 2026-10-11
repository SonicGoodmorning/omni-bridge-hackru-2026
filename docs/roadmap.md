# SayAhh development roadmap

Updated October 10, 2026. Prioritize the working application for the hackathon. This roadmap does not assume that a demo is validated for patient care.

## Delivered in this development pass

| Capability | What works now | Boundary |
| --- | --- | --- |
| Plain English and broader language support | English simplification plus live generation in 15 other languages throughout conversations, documents, profiles and plans; Arabic/Urdu right-to-left output | New generation languages use some English controls; fluent review and full UI localization remain pending |
| Explain jargon | A dedicated meaning-question tool with live general explanations, independent English rendering, cancellation and no patient profile transmission | Educational AI output stays separate from clinician messages and action plans |
| Patient profile | Optional nickname, exact age, sex, height/weight, language, location, chosen familiar foods, budget/access, cooking, work/activity, diet/fasting practices, health background and support needs; one editable fictional profile (Ege, Delran) | Self-reported background; no identity verification, account or medical-record integration |
| Profile privacy | Explicit AI-context permission, name, pronouns, exact age, sex, height, weight, location, legacy identity/background fields, profile IDs and numbers excluded from model requests, optional browser saving, clear profile | Browser storage is unencrypted; use fictional details for this prototype |
| My numbers | Six metric widgets, 7/30-day SVG trends, two-number blood pressure, recording rhythm, source-labelled history, manual add/edit/delete and optional per-profile browser saving | Manual log; no wearable connection, health score, diagnostic interpretation or cloud sync |
| SayAhh redesign | Graphite/icy blue themes, locally served Barlow Condensed/Manrope, compact responsive navigation and redesigned existing workspaces | Visual system documented in DESIGN.md and UX-CONTRACT.md; deployment is separate |
| Appearance | Persistent light/dark header toggle across all workspaces, system preference on first use, responsive layouts | Device-local preference |
| Patient-chosen examples | Live conversation, document and consent explanations use explicitly entered preferences and target-language food examples | Examples explain concepts, preserve original restrictions and numbers, and never authorize food substitutions or medication changes; review required |
| Post-visit plan | Gemini extracts steps and unanswered questions from the entire shared bilingual conversation, in the selected patient language | Clinician originals supply instructions; participant speech and examples cannot authorize care |
| Review and clarification | Exact clinician source quotes, independent English rendering, quantity/negation checks, missing-medication-field blocks, conflict questions and a review gate | Automated checks cannot prove clinical or translation accuracy |
| Personal checklist | Daily occurrences, one-time/as-directed steps, completion progress, local day selection, speech playback and UTF-8 download | Personal checkmarks, not adherence verification; no push reminders or automatic scheduling |
| Visit history and plan continuity | Patient-filtered/searchable local visits, optional patient snapshots, independent reviewed plans and checkmarks, source/context fingerprint matching and renewed review; continuing a planned visit or replacing its plan preserves the earlier version | Browser-local and unencrypted; no authenticated ownership or cloud sync |
| Question handoff | Send a generated question into the participant composer for translation and human response | Never generates a clinician answer or sends messages to another person automatically |

## Next hackathon milestone: submission release candidate

**Scope:** finish and verify the existing app for submission. Do not add product features in this milestone.

| Status | Work | Completion condition |
| --- | --- | --- |
| Implemented locally | Individual preferences instead of identity assumptions | Ethnic-category and ancestry inputs removed; legacy identity fields stripped from AI context; chosen foods, dietary restrictions, allergies, communication and access needs retained |
| Implemented locally | Single editable profile | Only Ege is selectable; the removed profile cannot return from remembered-profile storage; Ege’s saved details and readings keep their stable record ID |
| Pending release check | Verify the final deployed revision | English jargon simplification → shared conversation → source-linked, reviewed action plan → save/reopen works on the submission URL; verify profile and numbers saving too |
| Pending teammate check | Review the judging language and laptop | A fluent teammate checks meaning and respectful wording; microphone/playback works, or typed input is used; failed requests retain entered text and allow retry |
| Pending submission handoff | Freeze and submit the verified build | Record the final deployment URL and commit, confirm repository access and organizer requirements, and submit those links with accurate feature and AI-assistance disclosures |

The final protected Vercel preview is recorded in [submission release](submission-release.md). Real microphone/playback and fluent teammate checks on the judging laptop remain open. No new presentation work, integrations or accounts are part of this milestone. The later product milestones below stay deferred until after submission.

## Priority order before submission

These are remaining development tasks, not completed claims. Estimates are rough engineering budgets for one developer, excluding external access and review.

| Priority | Work | Estimate | Done when |
| --- | --- | --- | --- |
| P0 | Deploy this revision to the team's existing environment with its server-side Gemini configuration | 20–40 min | Profile → new live explanation → shared transcript → reviewed plan → saved plan restoration works on the deployed URL |
| P0 | Native-language review of the UI and generated content in the language used for judging | 30–60 min | A fluent teammate reviews meaning, numbers, restrictions, cultural relevance and clarification wording |
| P0 | Microphone and playback on the actual judging laptop, with typed input as fallback | 15–30 min | Permission refusal, missing voice and network failure leave a usable typed workflow |
| P1 | Localize the remaining English profile and reviewer controls; retain English reviewer aids | 1–2 hr | A patient can complete onboarding and operate all patient controls in each supported language, starting with the judging languages |
| P1 | Explicit visit start/end and clinician-confirmed calendar dates | 2–4 hr | Relative dates and limited courses cannot silently become unbounded daily schedules |

Freeze lower-priority work if it threatens the functioning live workflow. Keep family accounts, EHR integration, 3D models and electronic signatures out of the submission critical path.

## Next product milestones

### 1. Complete the visit workflow

**Outcome:** a durable, understandable plan with clear ownership.

- Delivered locally: profile snapshots, per-visit plans/checkmarks and preserved revisions in Visit history. Next, add explicit visit start/end and durable authenticated ownership; historical legacy turns cannot be retroactively assigned a known AI context.
- Separate clinician review from patient acknowledgement with authenticated roles when accounts are introduced.
- Preserve original and simplified wording as separate layers so users can inspect terminology without losing the accessible explanation.
- Add clinician-confirmed start/end dates, timezone and recurrence before calendar reminders. Model suggestions must never schedule a dose automatically.
- Support editing the clinician's source instructions and regenerating a versioned plan rather than silently editing translated instructions.
- Keep progress supportive; avoid streak penalties or rewards that encourage taking a medicine outside the prescribed conditions.

**Dependencies:** a chosen account/data model, intended user population, language review, and clinician input on the workflow.

### 2. Family Sync

**Outcome:** an invited family member can follow a session and submit questions.

- Authenticated, expiring invitations; patient-controlled access and explicit sharing scope.
- A session service and persistent database with access checks for each participant, not a public room code alone.
- Stream only reviewed/shared messages; reconnect with sequence IDs and prevent duplicate or out-of-order turns.
- Translate family questions into the clinician's view as attributed questions, with no generated clinical answer.
- Let the patient revoke access and end broadcasting immediately. Define retention and deletion before storing real records.

**Acceptance:** invited viewers see the same ordered reviewed text; revoked and expired viewers lose access; reconnection never shows an unreviewed draft.

### 3. Visual aids

**Outcome:** clinical terms can open a source-linked, accessible visual.

- Begin with a small clinician-reviewed glossary of anatomy diagrams and text alternatives.
- Use explicit term-to-asset IDs rather than unconstrained generated medical imagery.
- Add mobile interaction and an enlarged patient view; keep the text explanation available without graphics.
- Add 3D anatomy only when it explains something the existing diagram cannot.

**Acceptance:** the correct diagram opens for the term, includes accessible explanatory text, and never implies a diagnosis from a conversation mention.

### 4. Consent comprehension

**Outcome:** the patient can explain the trial's risks, uncertainty and choices in their own language.

- Add document upload, text extraction/OCR, page references, revision IDs and document limits.
- Build a source-grounded teach-back flow with human review of answers and a route for unresolved questions.
- Treat a quiz as education; a score must not be represented as informed consent or eligibility.
- Keep signatures separate until the institution defines and approves its required consent workflow.

**Acceptance:** every explanation and question links to the correct document revision and page; unanswered risk questions stay visible and cannot be bypassed by a score.

### 5. Readiness for a supervised pilot

**Outcome:** the team has evidence and operational controls for its intended use.

- Decide what data may be sent to each provider, who is allowed to access it, and how long it is retained.
- Replace local-only storage with an appropriate authenticated service, encrypted transport/storage, scoped permissions and an auditable version history.
- Establish provider availability handling, abuse controls, request budgets and support ownership.
- Run qualified language and clinician review across the intended scenarios, including medication changes, conflicting instructions and cultural mismatch.
- Define escalation to a qualified interpreter and clinician whenever the tool cannot safely support understanding.
- Obtain institution-specific privacy, security, legal and clinical review before handling real patient records.

## Failure modes and implemented responses

| Failure | Current response | Remaining limitation |
| --- | --- | --- |
| Invalid or missing numbers | Bounded numeric input, paired blood-pressure validation, future-time rejection, empty charts and no fabricated personal readings | Broad input bounds are data-entry checks, not healthy ranges |
| Switching people | Separate profile record IDs and readings; new-person save clears the active conversation and plan | Earlier saved conversations are separate records; browser storage is not authentication |
| Numbers storage unavailable/full | Session remains usable, bounded reads/writes and visible saving error; explicit delete-all control | Optional browser storage is unencrypted and device-local |
| Unknown profile details | Optional fields; blanks mean unknown; AI cannot fill missing clinical instructions from the profile | The patient or clinician must supply accurate background |
| Cultural stereotyping | No ethnic-category intake or preset ancestry; legacy identity fields excluded from AI input; examples require opt-in and individually stated familiarity | AI can still choose a poor example; human review remains necessary |
| Food restrictions/allergies conflict | Prompt requires omission or a clarification concern; original restrictions remain intact | Conflict detection is model-assisted, not an allergy-checking system |
| Ambiguous medicine or “red pill” | Missing name/dose/route/timing blocks the step and requests clarification | Source accuracy and safe prescribing remain the clinician's responsibility |
| Conflicting instructions | Read all turns, prefer explicit replacements, otherwise clarify and pause the checklist | The model may miss a conflict; every step needs source review |
| Clipped source or invented quantities | Source ID and verbatim quote validation, automatic expansion to complete source sentences, numerical/negation checks and independent rendering | These checks are limited heuristics, not semantic proof |
| Transcript too long | Explicit 100-turn/100,000-character limit; reject instead of truncating | Long visits need a future versioned segmentation workflow |
| Rate limit, timeout, bad output | Clear error, cancellation and retry; transcript kept; no automatic sample substitution | No offline AI generation |
| Settings or source change during generation | Abort, discard stale responses, clear approval/progress and require regeneration | Older shared text remains unchanged |
| Wrong saved plan for a patient | Visit-specific plan storage, restored patient snapshot, matching transcript/language/AI-context fingerprint, explicit intended-patient check and renewed review; snapshot-free legacy visits open with blank details and AI context off | Browser saving is not authenticated patient identity |
| Storage failure, corrupt history or another tab | Saving errors remain visible; unreadable/external changes are protected from overwrite; in-memory work remains usable, per-visit deletion can free space | Browser copies are unencrypted/device-local; reload to reconcile another tab |
| Missing voice or speech permissions | Typed input and readable text remain available | Browser/OS voice coverage varies |
| Midnight/date mismatch | Device-local calendar day; daily marks keyed by date; one-time marks do not reset daily | Start/end dates and reminders are not yet scheduled |

## Implementation map

- `src/lib/patient/profile.ts`: profile and model-context schemas, cultural policy and localized example labels.
- `src/components/patient-profile.tsx`, `/profile`: patient intake and privacy choices.
- `src/lib/{visits,documents,bridge}/prompts.ts`: context-aware explanations.
- `src/lib/action-plan/`: structured generation, blind reverse rendering, source validation and blocking rules.
- `POST /api/action-plan`: bounded server-side Gemini requests and actionable errors.
- `src/hooks/use-action-plan.ts`: cancellation, invalidation, completion tracking and optional local persistence.
- `src/components/action-plan-workspace.tsx`, `/action-plan`: reviewed checklist, source inspection, questions, playback and download.

## Validation for this revision

Type checking and a production build completed during development. Live Gemini requests with fictional content verified a personalized Spanish carbohydrate explanation and a source-linked Spanish action-plan operation. Live checking exposed upstream response-schema rejection and missing extraction/timing behavior; the implementation now uses compact model schemas with strict server validation, expands exact excerpts to complete source sentences, rejects a suspicious empty extraction, and pauses missing-timing steps. These observations are limited development checks, not language or clinical validation. No new presentation assets or broad automated test suite were added for this pass.

The final browser check also verified an explicit clinician correction superseding earlier restrictions, reviewed checklist activation, opt-in plan/checkmark saving, matching restoration after refresh with renewed review required, and the phone-sized layout. These checks used newly typed fictional conversation content and live Gemini, not a prepared checklist.

## My numbers and appearance follow-up

The `/numbers` workspace provides manual heart rate, blood pressure, oxygen, sleep, steps and weight logging. Ege is the only selectable fictional profile, with editable demographics, Delran as the hometown and a labelled 30-day synthetic history. Loading a sample on the profile page only changes the draft until Save; switching people in My numbers applies immediately and starts a fresh conversation. Profile weight is labelled separately from logged scale readings. Profile saving and numbers saving are independent opt-ins.

Next for numbers: authenticated profile/visit ownership, explicit device-provider consent and provenance, supported device import with timezone/deduplication handling, and clinician-defined targets before any alerts or clinical interpretation. None of these integrations are claimed by the manual dashboard.

Validation for the numbers/appearance revision: type checking and the production build passed. Browser checks used fictional data to verify paired blood-pressure rejection, valid entry, editing, saved profile/numbers restoration, separate Carlos/Mei histories, light/dark switching and restoration, and phone layout. The 390px header overflow was corrected. Dialog focus and Escape dismissal were checked in development mode. All five authored profiles and their 900 generated readings passed runtime schemas; display demographics were confirmed absent from AI context. These are development checks, not clinical or device validation.


## Patient-linked visit history follow-up

Delivered `/history` and the shared Visit history dialog with search, patient filters, saved demographic/context inspection, transcript and plan reopening, rename and per-visit deletion. New visits capture a profile snapshot when the profile is remembered; session-only profiles require explicit snapshot saving or the reviewed plan’s saving choice, which explains the included profile details. Opening a visit restores its snapshot without overwriting the separately remembered profile. Missing snapshots load blank background with AI context off. Continuing a visit with a saved plan, changing a bound profile snapshot, or replacing a saved plan retains the older revision.

Legacy v1/v2 transcripts migrate without fabricated patient ownership. The old standalone plan remains available for fingerprint-checked restoration and explicit linking. Plan progress remains independent per visit and approvals are cleared on reopening. Bounded schema validation, storage failure messages and protection against unreadable history or a conflicting tab preserve the last successful browser copy.

Next development priorities: finish native-language controls, add clinician-confirmed visit dates/start/end, then consent-document upload with source references. Family Sync and diagram integration follow the working visit workflow. Deployment and microphone checks on the judging laptop remain submission tasks.

Validation for visit history: type checking and production compilation passed during development. Live Gemini browser checks created separate fictional Carlos/Spanish and Mei/Mandarin visits, saved independent plans, preserved Carlos’s checkmark while Mei remained unmarked, exercised patient filtering/search and rename, restored Carlos after refresh with review cleared, and continued a planned visit while retaining the original source and plan. Legacy snapshot-free visits opened with blank profile context. A 390px viewport had equal content/viewport width; modal dismissal was also checked. Refresh checking exposed Strict Mode replay of remembered-profile hydration; a one-time hydration guard now prevents it from replacing the restored visit snapshot. The same live check corrected recognition of explicit “each morning” as daily frequency. Runtime schema checks covered legacy migration, unknown ownership, round-trip storage and rejection of a foreign patient snapshot. These are development checks with fictional data, not clinical or language validation.

## English and worldwide language revision

English is a first-class target and the default for new profiles. Existing saved languages remain intact. Clinician wording simplifies into respectful everyday English, including uncertainty such as an unknown cause; participant questions stay faithful questions. The separate `/explain` tool can answer general vocabulary questions without placing AI-generated statements in the clinician transcript or checklist.

Live languages: English, Spanish, Mandarin (Simplified), Hindi, Arabic (Modern Standard), French, Portuguese (Brazil), Bengali, Russian, Urdu, Indonesian, German, Japanese, Korean, Vietnamese, and Turkish. The original five sample sets plus English remain available without model calls. The other ten languages require Live and return an explicit unsupported-sample response if requested through the API. No fallback silently changes the output language.

Next language work: native review of selected judging languages, full localization of patient controls and diagrams, and device checks for speech recognition/installed voices. Language availability is not a claim of validated medical interpretation.

Development verification for this language revision: the production build and a fresh TypeScript check passed. Runtime schemas accepted all 16 locales across profiles, visits, trial/document explanations and plans; six prepared sample sets validated, and all ten live-only locales explicitly rejected sample requests. Browser checks exercised live English vocabulary explanations, English clinician simplification, preservation of patient questions, live Arabic output and right-to-left display, automatic Sample-to-Live switching for French, French document generation, and the French action-plan empty state. A French draft that replaced 50% with a fraction was blocked; stricter digit/unit instructions produced a subsequent draft retaining 50% that passed the quantity check. The new tool had no page overflow at 390px and was inspected at desktop size in dark mode. These checks do not establish fluent language or clinical accuracy.

Jargon failure handling: only English input text and the selected language are transmitted, not the patient profile. Requests have strict schemas and a body cap, a shared server deadline, client cancellation, and exact response identity/source checks. Editing text or changing language/session invalidates pending answers. Model ambiguity or changed-detail flags are visible before the explanation's review notes. Unavailable voices leave the written explanation usable. General AI answers are never appended to the clinician transcript or extracted into a post-visit plan.
