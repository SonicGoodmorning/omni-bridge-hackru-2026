# Project SayAhh

**HackRU submission:** [Devpost-ready copy](docs/submission.md) · [Release checks and protected demo](docs/submission-release.md) · [Morning checklist](docs/morning-checklist.md). Enter Gemini with Regeneron and Best UI/UX. Team target: 9:30 a.m. Eastern, October 11.

A HackRU Fall 2026 education prototype that connects understanding a document, a bilingual conversation, and a source-linked post-visit plan. The app now includes:

- **Plain-English mode:** English-speaking patients can simplify clinical wording without switching languages.
- **Explain jargon:** ask what an English medical term or sentence means; live Gemini gives a general explanation in any supported language, separate from the clinician transcript and action plan.
- **Document guide:** explain the fictional CLEAR trial or a fictional outpatient follow-up note, inspect the original paragraphs and review aids, then explicitly share a draft.
- **Patient profile:** optional language, individually chosen food and communication preferences, self-reported health background, communication and access needs, with explicit AI-context permission and optional browser saving.
- **Visit history:** searchable patient-linked local visits, optional profile snapshots, independent plans/checkmarks, preserved earlier revisions, and safe restoration.
- **Action plan:** live Gemini extraction from the entire shared transcript, a patient-language checklist, original clinician quotes, separate English renderings, clarification questions, completion progress, speech playback, download, and optional local saving.
- **Conversation:** bring a participant question and its paragraph context into a two-way exchange. English clinician messages simplify into plain English or translate into the participant's language, and participant messages translate faithfully into English. Both can type or speak.

Conversation translates the humans' own words and does not generate the clinician's answer. Explain jargon is a separate educational tool that answers general vocabulary questions. With profile permission, explanations can use patient-supplied familiar food examples without replacing source restrictions. The action plan extracts existing clinician instructions; it does not prescribe new care. Source-linked explanations, a separate reverse rendering, and automated flags support review but do not establish accuracy, informed consent, or fitness for actual patient care.

See [the implementation roadmap and failure handling](docs/roadmap.md) for delivered features, submission priorities, and future milestones.

[Public source repository](https://github.com/SonicGoodmorning/omni-bridge-hackru-2026)

[Open the unified app](https://express-monsoon-5gkbxhw-2phuvkhv0-egegoodmorning-6248.vercel.app) · [Conversation](https://express-monsoon-5gkbxhw-2phuvkhv0-egegoodmorning-6248.vercel.app/visits) — protected Vercel Preview, ready October 10, 2026. Use the team’s signed-in laptop for judging. The Gemini key remains an encrypted, sensitive server-side Preview environment variable, with `GEMINI_MODEL=gemini-3.5-flash-lite`. Sample mode needs no model calls.

## Run locally

Use Node.js 22 or newer and npm:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open [localhost:3000](http://localhost:3000). Prepared examples work without a key. For live calls, set `GEMINI_API_KEY` in the ignored `.env.local` and restart. The configurable server default is `gemini-3.5-flash-lite`; choose a model available to your account if needed. Never prefix the key with `NEXT_PUBLIC_`.

```sh
npm run typecheck
npm test
npm run build
npm start
```

Production start requires a successful build. To run browser checks:

```sh
npx playwright install chromium
npm run test:e2e
```

Alternatively, set `PLAYWRIGHT_CHROME_PATH=/absolute/path/to/chrome` when running the suite. Playwright starts a development server on port 3000, or reuses one outside CI. Unit tests use Node's test runner with `tsx`. Commands alone do not establish completed QA; see [observed results](docs/acceptance.md).

For hosting, [import the repository into Vercel](https://vercel.com/docs/git/vercel-for-github), configure private server environment variables, and redeploy. The local key is excluded from Git and deployment source. An encrypted hosting secret does not belong in browser code or a public repository.

## One connected demonstration

1. Choose Turkish and the fictional CLEAR trial in Document guide.
2. Select randomization, prepare a draft, and inspect its original, translation, English rendering, and flags.
3. Confirm review and share the exact draft with the participant.
4. Attach a question to a shared paragraph and open Conversation.
5. Translate the participant's own question into English, review, and share.
6. Have the human coordinator supply a reply, then translate, review, and share it in the other direction.

The language and source context remain in the session across navigation. Reading preferences enlarge display text without rewriting a reviewed explanation. New session clears active work while keeping the current profile and earlier saved conversations. Shared conversation turns save in this browser. Remembered profiles are captured in new visit snapshots. Session-only profiles are excluded until you explicitly save a snapshot or save a reviewed plan with its snapshot. Each visit keeps its own plan and checkmarks; drafts remain session-only. Visit history at `/history` restores its saved patient snapshot, conversation and language; the plan must match the source fingerprint and be reviewed again. Opening a visit without a snapshot clears AI context rather than applying another patient’s background. Continuing a planned visit or changing a saved patient snapshot creates a separate revision; replacing a saved plan preserves its prior version. There are no accounts or database. Clear the profile when switching patients.

The 16 patient languages are English (`en-US`), Spanish (`es-419`), Mandarin Chinese with Simplified Chinese (`zh-CN`), Hindi (`hi-IN`), Modern Standard Arabic (`ar-SA`), French (`fr-FR`), Brazilian Portuguese (`pt-BR`), Bengali (`bn-BD`), Russian (`ru-RU`), Urdu (`ur-PK`), Indonesian (`id-ID`), German (`de-DE`), Japanese (`ja-JP`), Korean (`ko-KR`), Vietnamese (`vi-VN`), and Turkish (`tr-TR`). New profiles default to English; saved choices remain unchanged. Arabic and Urdu output uses right-to-left layout. All generated language content needs qualified review. Some interface controls and local diagrams remain in English; adding a generation language does not claim complete interface localization.

## Sources and engines

| Source | Sample mode | Live mode |
| --- | --- | --- |
| Fictional CLEAR trial | Six prepared sections in six languages, including plain English | Source-grounded plain-language explanations |
| Fictional visit summary | Three prepared source-linked paragraphs in six languages, including plain English | Attributed explanations of the fictional note |
| Pasted public or fictional English | Unsupported; explicit error | 1–4,000 characters with source acknowledgment |
| Explain jargon | No prepared fallback | General vocabulary explanations in 16 languages |
| Two-way conversation | Eight alternating prepared turns in six languages, including English | Arbitrary reviewed speaker messages up to 4,000 characters |

Prepared examples cover English, Turkish, Spanish, Portuguese, Hindi, and Mandarin. The other ten languages require Gemini live. Choosing one switches a Sample session to Live when configured; unavailable engines stay explicit, with no invented sample or silent language substitution.

**Use next sample turn** fills a supported utterance and leaves translation, review, and sharing explicit. **Open prepared conversation** loads the full fixture and clearly states that no live call or individual review took place. A failed live request never silently substitutes a sample. The retained legacy English-only bridge endpoint also accepts its fixed script, documented in [the API contract](docs/api.md).

CLEAR-026 (`DEMO-1.0`, October 10, 2026) is fictional and is not an approved consent form. Its source includes a 50% chance of either group, possible placebo, no guaranteed benefit, four visits over eight weeks, roughly 60 minutes per visit, and 5 mL blood samples at the first and final visits. Its collected-data policy is deliberately unspecified and must not be invented.

The outpatient note is also fictional. Explanations must attribute its assessment and documented plan to the note, preserve the recorded numbers, names, units, negation, and timing, and avoid creating a new recommendation. The small authored glossary cites its fictional sources. There are no uploads, OCR, PDF ingestion, EHR integrations, or real patient records. Patient profile fields accept optional fictional background for the prototype; they are not a verified medical chart.

## Architecture and review

Next.js App Router, TypeScript, React reducers/context, Tailwind CSS, Zod, and Google's `@google/genai` SDK form one application. The root session provider connects the document and conversation controllers.

- `POST /api/bridge` handles the fixed trial.
- `POST /api/documents` handles the fictional note and acknowledged synthetic paste.
- `POST /api/visits` translates a human turn in either direction, or simplifies clinician wording into English.
- `POST /api/explain` explains an English medical term or meaning question using live Gemini. It accepts no patient profile and does not append an AI answer to the conversation or action plan.
- `POST /api/action-plan` extracts a checklist and clarification questions from up to 100 shared turns / 100,000 combined transcript characters. It uses live Gemini regardless of the conversation engine; there is no prepared plan fallback.

Start at `/profile`, save your choices, then share a live clinician message in Conversation. Open `/action-plan`, verify the intended patient and language, generate, inspect original sources and independent English renderings, and activate only after review. Missing medicine details or blocked items pause the checklist; bring a clarification question back to Conversation, share the clinician’s response, and regenerate. Saving a profile invalidates pending reviews and the active plan; changing its language starts a new conversation while keeping earlier saved conversations.

Each complete live operation uses two stateless calls under one 45-second overall server deadline. The first explains or translates the source. The fresh second call receives only generated target text and identifiers, without original content or history, to render it back into the source language. The same model can repeat an error. Zod validation, paragraph links, quantity checks, and release eligibility assist human inspection.

Request identity, exact source, locale, engine, and direction bind a draft to its context. Source/language/engine changes invalidate affected review state and cancel pending work. Outdated or mismatched responses cannot become current drafts. Blocking flags disable sharing. Display-size preferences preserve the wording and review state. See [integration behavior](docs/integration.md), [API contracts](docs/api.md), and [conversation details](docs/visits.md).

## Recorded validation

The English/worldwide-language revision passed the production build and a fresh TypeScript check. All 16 locale input contracts and six prepared sample sets were checked; live English, Arabic and French paths were exercised in the browser, including question preservation, right-to-left output, quantity blocking/retry, Sample-to-Live switching and a 390px layout. These are development checks, not fluent or clinical review. See the [language revision notes](docs/roadmap.md#english-and-worldwide-language-revision).

The submission release passes **62 unit tests**, type checking and the production build. **39 browser cases** passed in the final full run (35.1 seconds). These checks are development evidence; see [the release record](docs/submission-release.md).

The earlier unified implementation passed **59 unit tests, 30 browser tests, type checking, and the production build**, recorded October 10, 2026. Those counts predate the profile, cultural-context and action-plan changes; they do not certify the new features. Browser checks cover 14 connected-document cases and 16 Conversation cases; live model and speech behavior are mocked in that suite. A separate real synthetic-paste Gemini operation completed in 2,798 ms wall time; see [its actual response](docs/documents-live-qa.json). This is one observation, not a benchmark.

Earlier builds passed 40 unit cases and 26 browser cases, including mocked speech and playback. An earlier fresh clone passed setup, 25 then-existing unit tests, type checking, and production build. These historical results do not certify the later integration. The updated 11-slide HTML deck passed screen/print overflow checks and visual inspection; the updated 11-page PDF was exported and visually reviewed without observed clipping.

Actual earlier live checks completed trial randomization in Turkish, Spanish, Portuguese, and Hindi, and two-way Turkish conversation. Quota prevented remaining trial cases. A later Flash-Lite participant question completed in 1,594 ms, which is one observation and not a benchmark. See [the acceptance record](docs/acceptance.md), [trial report](docs/live-qa.json), and [conversation report](docs/visits-live-qa.json). Real microphone/voice testing, fluent review, and clinical validation remain pending.

## Privacy and limits

Use public or synthetic material and consenting teammates. Do not enter patient identifiers or protected health information. Live text goes to Gemini; browser speech recognition may use a remote speech service. Recognition support, permissions, network access, and installed voices vary. Typed input remains available.

The session gate is not authenticated clinical approval, an audit trail, an electronic signature, or verified consent. The app provides no diagnosis, treatment advice, or generated clinician response and is not ready for clinical deployment. Keep credentials, personal transcripts, private email screenshots, and recordings without consent out of Git and submission assets.

## Demo and submission

Use [the integrated three-minute script](docs/demo.md) and [11-slide presentation](docs/demo-slides.html). The deck is also available at [localhost:3000/demo-slides.html](http://localhost:3000/demo-slides.html). The refreshed [11-page PDF](docs/demo-slides.pdf) and [silent captioned video](docs/demo.webm) show this integrated build. The video lasts **2 minutes 40.76 seconds**, includes three genuine live operations (trial explanation and both conversation directions), and labels the visit-note sample separately. [Actual recorded responses](docs/integrated-demo-qa.json) and [capture metadata](docs/demo-capture.json) accompany it. Updated images show the [review workspace](docs/screenshots/document-review.png), [question handoff](docs/screenshots/document-question-handoff.png), [visit note](docs/screenshots/visit-document.png), and [mobile participant view](docs/screenshots/mobile-participant.png).

Read [the verified guidelines check](docs/guidelines.md): choose **one track and at most two superlatives**, use 10 a.m. Eastern on Sunday, October 11 as the conservative build/submission cutoff, and confirm conflicting judging notices on site. Gemini track with UI/UX and the Regeneron clinical-trials superlative matches the intended entry. Separate MLH category eligibility and AI-use policy still need organizer confirmation.

The project uses [MIT](LICENSE). Regeneron favors reproducible open-source work and suggests roughly three minutes of video and 10–12 slides. Inspiration came from [Teach It Back](https://drive.google.com/file/d/1_UkzCt6a3uxCefqlm7j7ai7GCYB4Fz5x/view) and [Lost In Translation](https://drive.google.com/file/d/1Ni32VvTU43TI9U5UYAEROXpuf3_KDJQd/view).

Planning used Gemini 3.1 Pro, and Codex assisted implementation, tests, debugging, deployment, documentation, and presentation drafts. The team must review the result and disclose its actual build timeline and pre-existing components. See [provenance and unresolved requirements](docs/guidelines.md#ai-assistance-and-provenance-disclosure).

## My numbers, profiles and appearance

Open `/numbers` for heart rate, blood pressure, blood oxygen, sleep, steps and weight widgets, 7/30-day trends and manual reading history. Add, edit and delete readings; validation checks units, numeric bounds, blood-pressure pairs and future timestamps. Data-entry bounds are not healthy ranges. There is no device connection or diagnostic score. Blank profiles have no invented readings.

Ege (Delran) is the only selectable fictional profile, with editable demographics, individual food/lifestyle preferences and a labelled 30-day history. Choose Ege in `/profile` and save, or use the picker in My numbers. Ethnic categories and ancestry inputs have been removed; legacy identity fields are excluded from AI context. Explanations use only preferences the patient chooses, with opt-in. Numbers are isolated by record ID and excluded from Gemini requests. Exact demographics and location also stay in the browser.

Profile and numbers saving are separate browser-only opt-ins. Remember the personal profile as well as its numbers to restore both after refresh. Use Clear all numbers to delete saved readings for every record; fictional histories reset. The header appearance toggle switches the whole app between light and dark, remembers the choice, and otherwise follows the system. The SayAhh palette is defined once in `src/app/theme.css`; screen styles use semantic tokens. See [DESIGN.md](DESIGN.md) and [UX-CONTRACT.md](UX-CONTRACT.md) for visual and interaction contracts.

The [SayAhh redesign verification](docs/redesign-verification.md) records local screen checks, screenshot evidence and compatibility limits.


## Patient-linked visit history

Open **Visit history** from Conversation or Menu, or navigate to `/history`. Search patient names, visit titles and bilingual transcript text; filter by patient; inspect demographics and context; rename, reopen or delete a visit. **Open action plan** restores the visit first; confirm the intended patient and restore/review its plan before using the checklist. Plans and progress are separate for each visit.

Storage uses the bounded `omnibridge.visits.v3` library. Previous v1/v2 conversations migrate without assuming a patient identity. The earlier standalone action-plan copy stays available for matching restoration and explicit linking; it is never silently assigned to an unrelated visit. Unreadable history is protected from automatic overwrite. Storage failures leave current work in memory, and conflicting writes from another tab require a reload instead of overwriting its saved history. This remains unencrypted browser-local prototype storage; no accounts or cloud sync are implemented. Removing a separately remembered profile does not delete snapshots already saved in visits; delete those visits separately.
