# Project Omni-Bridge

A HackRU Fall 2026 education prototype that connects understanding a document with asking the next question. A research coordinator and participant share one session across two workspaces:

- **Document guide:** explain the fictional CLEAR trial or a fictional outpatient follow-up note, inspect the original paragraphs and review aids, then explicitly share a draft.
- **Conversation:** bring a participant question and its paragraph context into a two-way exchange. English clinician messages translate into the participant's language, and the participant's messages translate into English. Both can type or speak.

The app translates the humans' own words. It does not generate the clinician's answer. Source-linked explanations, a separate reverse rendering, and automated flags support review but do not establish accuracy, informed consent, or fitness for actual patient care.

[Public source repository](https://github.com/SonicGoodmorning/omni-bridge-hackru-2026)

[Open the unified app](https://express-monsoon-5gkbxhw-gs5nn2i3b-egegoodmorning-6248.vercel.app) · [Conversation](https://express-monsoon-5gkbxhw-gs5nn2i3b-egegoodmorning-6248.vercel.app/visits) — protected Vercel Preview, ready October 10, 2026. Use the team’s signed-in laptop for judging. The Gemini key remains an encrypted, sensitive server-side Preview environment variable, with `GEMINI_MODEL=gemini-3.5-flash-lite`. Sample mode needs no model calls.

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

The language and source context remain in the session across navigation. Reading preferences enlarge display text without rewriting a reviewed explanation. New session clears the work. Refreshing or closing the page loses it; there are no accounts or database.

The five participant languages are Turkish (`tr-TR`), Latin American Spanish (`es-419`), Brazilian Portuguese (`pt-BR`), Hindi (`hi-IN`), and Mandarin with Simplified Chinese (`zh-CN`). **All five need qualified language review. Turkish team review remains pending.**

## Sources and engines

| Source | Sample mode | Live mode |
| --- | --- | --- |
| Fictional CLEAR trial | Six prepared sections in five languages | Source-grounded plain-language explanations |
| Fictional visit summary | Three prepared source-linked paragraphs in five languages | Attributed explanations of the fictional note |
| Pasted public or fictional English | Unsupported; explicit error | 1–4,000 characters with source acknowledgment |
| Two-way conversation | Eight alternating prepared turns in all five languages | Arbitrary reviewed speaker messages up to 4,000 characters |

**Use next sample turn** fills a supported utterance and leaves translation, review, and sharing explicit. **Open prepared conversation** loads the full fixture and clearly states that no live call or individual review took place. A failed live request never silently substitutes a sample. The retained legacy English-only bridge endpoint also accepts its fixed script, documented in [the API contract](docs/api.md).

CLEAR-026 (`DEMO-1.0`, October 10, 2026) is fictional and is not an approved consent form. Its source includes a 50% chance of either group, possible placebo, no guaranteed benefit, four visits over eight weeks, roughly 60 minutes per visit, and 5 mL blood samples at the first and final visits. Its collected-data policy is deliberately unspecified and must not be invented.

The outpatient note is also fictional. Explanations must attribute its assessment and documented plan to the note, preserve the recorded numbers, names, units, negation, and timing, and avoid creating a new recommendation. The small authored glossary cites its fictional sources. There are no uploads, OCR, PDF ingestion, EHR integrations, or real patient records.

## Architecture and review

Next.js App Router, TypeScript, React reducers/context, Tailwind CSS, Zod, and Google's `@google/genai` SDK form one application. The root session provider connects the document and conversation controllers.

- `POST /api/bridge` handles the fixed trial.
- `POST /api/documents` handles the fictional note and acknowledged synthetic paste.
- `POST /api/visits` translates a human turn in either direction.

Each complete live operation uses two stateless calls under one 45-second overall server deadline. The first explains or translates the source. The fresh second call receives only generated target text and identifiers, without original content or history, to render it back into the source language. The same model can repeat an error. Zod validation, paragraph links, quantity checks, and release eligibility assist human inspection.

Request identity, exact source, locale, engine, and direction bind a draft to its context. Source/language/engine changes invalidate affected review state and cancel pending work. Outdated or mismatched responses cannot become current drafts. Blocking flags disable sharing. Display-size preferences preserve the wording and review state. See [integration behavior](docs/integration.md), [API contracts](docs/api.md), and [conversation details](docs/visits.md).

## Recorded validation

The unified implementation passes **59 unit tests, 30 browser tests, type checking, and the production build**, recorded October 10, 2026. Browser checks cover 14 connected-document cases and 16 Conversation cases; live model and speech behavior are mocked in that suite. A separate real synthetic-paste Gemini operation completed in 2,798 ms wall time; see [its actual response](docs/documents-live-qa.json). This is one observation, not a benchmark.

Earlier builds passed 40 unit cases and 26 browser cases, including mocked speech and playback. An earlier fresh clone passed setup, 25 then-existing unit tests, type checking, and production build. These historical results do not certify the later integration. The updated 11-slide HTML deck passed screen/print overflow checks and visual inspection; the updated 11-page PDF was exported and visually reviewed without observed clipping.

Actual earlier live checks completed trial randomization in Turkish, Spanish, Portuguese, and Hindi, and two-way Turkish conversation. Quota prevented remaining trial cases. A later Flash-Lite participant question completed in 1,594 ms, which is one observation and not a benchmark. See [the acceptance record](docs/acceptance.md), [trial report](docs/live-qa.json), and [conversation report](docs/visits-live-qa.json). Real microphone/voice testing, fluent review, and clinical validation remain pending.

## Privacy and limits

Use public or synthetic material and consenting teammates. Do not enter patient identifiers or protected health information. Live text goes to Gemini; browser speech recognition may use a remote speech service. Recognition support, permissions, network access, and installed voices vary. Typed input remains available.

The session gate is not authenticated clinical approval, an audit trail, an electronic signature, or verified consent. The app provides no diagnosis, treatment advice, or generated medical response and is not ready for clinical deployment. Keep credentials, personal transcripts, private email screenshots, and recordings without consent out of Git and submission assets.

## Demo and submission

Use [the integrated three-minute script](docs/demo.md) and [11-slide presentation](docs/demo-slides.html). The deck is also available at [localhost:3000/demo-slides.html](http://localhost:3000/demo-slides.html). The refreshed [11-page PDF](docs/demo-slides.pdf) and [silent captioned video](docs/demo.webm) show this integrated build. The video lasts **2 minutes 40.68 seconds**, includes three genuine live operations (trial explanation and both conversation directions), and labels the visit-note sample separately. [Actual recorded responses](docs/integrated-demo-qa.json) and [capture metadata](docs/demo-capture.json) accompany it. Updated images show the [review workspace](docs/screenshots/document-review.png), [question handoff](docs/screenshots/document-question-handoff.png), [visit note](docs/screenshots/visit-document.png), and [mobile participant view](docs/screenshots/mobile-participant.png).

Read [the verified guidelines check](docs/guidelines.md): choose **one track and at most two superlatives**, use 10 a.m. Eastern on Sunday, October 11 as the conservative build/submission cutoff, and confirm conflicting judging notices on site. Gemini track with UI/UX and the Regeneron clinical-trials superlative matches the intended entry. Separate MLH category eligibility and AI-use policy still need organizer confirmation.

The project uses [MIT](LICENSE). Regeneron favors reproducible open-source work and suggests roughly three minutes of video and 10–12 slides. Inspiration came from [Teach It Back](https://drive.google.com/file/d/1_UkzCt6a3uxCefqlm7j7ai7GCYB4Fz5x/view) and [Lost In Translation](https://drive.google.com/file/d/1Ni32VvTU43TI9U5UYAEROXpuf3_KDJQd/view).

Planning used Gemini 3.1 Pro, and Codex assisted implementation, tests, debugging, deployment, documentation, and presentation drafts. The team must review the result and disclose its actual build timeline and pre-existing components. See [provenance and unresolved requirements](docs/guidelines.md#ai-assistance-and-provenance-disclosure).
