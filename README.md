# Project Omni-Bridge

A HackRU Fall 2026 prototype for explaining clinical research across languages. A research coordinator and a participant share one workspace with two equal modes:

- **Consent guide:** select a section of a fictional study document and prepare a simpler explanation in the participant's language.
- **Conversation bridge:** speak or type an English explanation, correct the transcript, and send it for simplification and translation.

Both modes keep the source visible, show an English back-translation for coordinator review, and require a coordinator to release a draft to the participant view. Back-translation and automated flags are review aids. They do not establish medical accuracy or replace a qualified interpreter, approved study materials, or a human consent discussion.

[Public source repository](https://github.com/SonicGoodmorning/omni-bridge-hackru-2026)

[Latest Vercel preview](https://express-monsoon-5gkbxhw-f3mutifxo-egegoodmorning-6248.vercel.app) — includes the final layout correction and requires Vercel authentication. The earlier [sample deployment](https://temporary-express-monsoon-5gkbxhw.vercel.app) was initially temporary and has been claimed. Both provide **Sample mode**; a private server environment variable enables live Gemini separately.

## Run locally

Use Node.js 22 or newer and npm. From the repository directory:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open [localhost:3000](http://localhost:3000). The sample walkthrough works without an API key. To make live Gemini requests, set `GEMINI_API_KEY` in `.env.local` and restart the development server. `GEMINI_MODEL` selects the server-side model; the default is `gemini-3.8-flash`. Choose a model available to your Google account if that model is unavailable. Never prefix the key with `NEXT_PUBLIC_`.

```sh
npm run typecheck
npm test
npm run build
npm start
```

The production start command requires a successful build. These are the reproducibility commands, not a claim that validation or human language review has passed. Record the actual run and manual-review results with the [acceptance checklist](docs/acceptance.md).

For browser tests, install Playwright's Chromium once, then run the suite:

```sh
npx playwright install chromium
npm run test:e2e
```

Alternatively, use an existing compatible Chrome installation with `PLAYWRIGHT_CHROME_PATH=/absolute/path/to/chrome npm run test:e2e`. The test configuration starts a development server on port 3000, or reuses an existing one outside CI. Unit tests run through Node's test runner with `tsx`; browser tests use Playwright.

For persistent hosting, [import the GitHub repository into Vercel](https://vercel.com/docs/git/vercel-for-github) as a Next.js project. Keep it in Sample mode without credentials, or configure `GEMINI_API_KEY` and `GEMINI_MODEL` in the project's private environment-variable settings for a controlled live demonstration, then redeploy. Local `.env.local` values are not part of the public repository or the temporary preview.

## Sample walkthrough and live engine

| Engine | What it does | What it does not establish |
| --- | --- | --- |
| Sample | Returns fixed, labelled examples for six consent sections in all five languages and one fixed conversation | A live model call, arbitrary conversation support, translation accuracy, or clinical validation |
| Live Gemini | Sends a section or reviewed English transcript through the server to Gemini, then makes a separate stateless back-translation request | Independent clinical verification or guaranteed faithful translation |

Sample mode never silently replaces a failed live request. Its fixed conversation is:

> You have a 50% chance of being assigned to either group. Neither you nor the researcher chooses the group. You may receive a placebo, which has no active study drug.

Use that text for a reproducible conversation demo without a key. Other text requires the live engine. A timeout, quota error, unsupported model, or malformed response must remain a visible failure with no newly releasable draft.

The five target locales are Turkish (`tr-TR`), Latin American Spanish (`es-419`), Brazilian Portuguese (`pt-BR`), Hindi (`hi-IN`), and simplified Chinese / Mandarin (`zh-CN`). These are language choices, not a claim of validated language coverage. **Turkish team review is pending. All five languages require qualified human review before any real use.**

## Fictional source document

The CLEAR Study (`CLEAR-026`, version `DEMO-1.0`, dated October 10, 2026) is a synthetic fixture, not an actual clinical trial or an IRB-approved consent form. Its six sections cover study purpose, randomization, visits and procedures, risks, voluntary participation, and withdrawal.

Facts to preserve include a 50% chance of either group, possible placebo assignment, no guaranteed benefit, four visits over eight weeks, visits of approximately 60 minutes, and 5 mL blood samples at the first and final visits. The source deliberately leaves the policy for already-collected data unspecified. An explanation must direct that question to the study team instead of inventing a policy.

## Architecture

The app uses Next.js App Router, TypeScript, React with reducer-managed session state, and Tailwind CSS. A Next.js server route calls Gemini through `@google/genai`; Zod validates structured output. The API key stays on the server. Source material is treated as content to explain, never as instructions that can override the model's task.

For live requests, the server first prepares the patient-language explanation, then asks Gemini in a separate stateless call to translate that result back to English. The back-translation call does not receive the original English source. This reduces shared context, but both calls can still share model weaknesses. Review flags and release eligibility support the coordinator's inspection; passing checks is not proof that a result is correct.

The live pipeline has a 45-second overall budget within a 60-second route duration. The source, mode, locale, request identity, and study version bind a draft to its context. A changed source or language must invalidate an earlier draft and its release state. The participant view receives only a result explicitly released by the coordinator.

See the [API contract](docs/api.md) for request and response fields and the [manual QA checklist](docs/acceptance.md) for failure and language scenarios.

## Validation recorded so far

The production build, type checking, 25 unit tests, and 10 browser tests passed during development. A fresh GitHub clone also passed `npm ci`, type checking, all 25 unit tests, and the production build with the example environment copied into place. All 11 presentation slides and the rendered PDF pages were visually checked. The browser speech cases use simulated recognition, so real microphone testing remains pending. A live Gemini run completed randomization explanations in Turkish, Spanish, Portuguese, and Hindi; quota errors prevented the remaining live cases, including Mandarin and conversation. See the [run record](docs/acceptance.md) and [synthetic live QA report](docs/live-qa.json) for exact coverage. No qualified language review or clinical validation is established by these checks.

## Privacy and prototype limits

- Use only public or synthetic material. Do not enter patient names, identifiers, records, or other protected health information.
- Live source text and generated translations are sent to Google's Gemini service. Review your account's service terms and data settings before using it.
- Browser speech recognition is browser-dependent and may send audio to the browser vendor's remote speech service. It is not promised to run on the device. Microphone use is optional; typed input remains available.
- The prototype is not a medical device, clinical interpreter, certified translation service, consent-record system, or system ready for clinical deployment. It offers no diagnostic, dosing, or treatment advice and does not obtain consent.
- The interface provides a session review gate, not authenticated clinical approval, a durable audit trail, or an electronic signature. Do not use it to record real consent.
- Do not commit `.env.local`, API keys, transcripts containing personal data, or recordings of people who have not agreed to participate. Limit demonstrations to consenting teammates and synthetic scenarios.

## Demo and submission materials

Follow the [three-minute demo walkthrough](docs/demo.md). Open [the 11-slide presentation](docs/demo-slides.html) directly in a browser; use the arrow keys, Home/End, or the navigation controls. A [printable PDF](docs/demo-slides.pdf) is also included. All assets and styles are local to the HTML file.

The deck is also served at [localhost:3000/demo-slides.html](http://localhost:3000/demo-slides.html). Captured materials include a [desktop workspace image](docs/screenshots/desktop-workspace.png), a [mobile viewport image](docs/screenshots/mobile.png), and a [silent, captioned sample walkthrough](docs/demo.webm) lasting 3 minutes and 0.68 seconds. The recording demonstrates fixed **Prepared sample** output and the review/release workflow; the separate live QA report documents the actual Gemini calls.

Regeneron's [HackRU judging document](https://docs.google.com/document/d/15uxWxH70wIqqCJw9W6IX4BHoVz4rDBDuj6FSb5GublI/edit) asks for an open-source solution and strongly favors a GitHub repository. MIT is preferred, rather than mandatory. A demo video and brief deck are listed as presentation materials; approximately three minutes and 10–12 slides are suggestions, with longer submissions allowed. This repository uses the [MIT license](LICENSE). Repository publication and application hosting are separate from preparing these local materials.

Relevant inspiration from the sponsor starter kit: [Teach It Back](https://drive.google.com/file/d/1_UkzCt6a3uxCefqlm7j7ai7GCYB4Fz5x/view) and [Lost In Translation](https://drive.google.com/file/d/1Ni32VvTU43TI9U5UYAEROXpuf3_KDJQd/view). The [MLH HackRU page](https://www.mlh.com/events/hackru-21/prizes) lists the Gemini API challenge. Check the event's current submission form for final requirements.
