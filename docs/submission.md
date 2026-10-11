# SayAhh — Devpost submission copy

Use the sections below in the existing HackRU entry. Final submission is owned by the team. Complete contributor invitations and any additional authenticated form questions before clicking Submit.

## Project name
SayAhh

## Tagline
Understand clinical-trial information and ask the next question in your language.

## Inspiration
Clinical-trial information contains distinctions that matter: an investigational medicine is not a guaranteed treatment, random assignment is not a choice, and joining a study is voluntary. We wanted participants and research coordinators to have an understandable explanation alongside the original wording, with a clear way to ask follow-up questions. Regeneron's “Lost In Translation” and “Teach It Back” starter ideas informed our focus. Our implementation demonstrates explanation and conversation; it does not implement or certify teach-back assessment or informed consent.

## What it does
SayAhh connects a source document with a bilingual conversation. A coordinator selects a section of the fictional CLEAR study, prepares a plain-language explanation, and inspects the original, generated text, independent English rendering, and automated flags before explicitly sharing the draft. A participant can attach a question to that section and carry it into Conversation. Gemini translates the participant's words into English and the human coordinator's reply into the participant's language. It does not generate the coordinator's answer.

The prototype supports live generation in 16 languages, including plain English, with prepared examples in six. Language availability is not a claim of qualified translation review or complete interface localization. Supporting tools include general jargon explanations, optional patient preferences, local visit history, manually entered numbers, and reviewed source-linked action plans. These support the broader workflow; the trial explanation and coordinator exchange are the main demonstration.

## How we built it
We used Next.js 16 App Router, React, TypeScript, Tailwind CSS, Zod, and Google's @google/genai SDK. Gemini runs on the server with a private API key. Each completed explanation or translation uses two stateless calls under one overall deadline. The second call receives only generated text and identifiers, without the original passage, to produce a reverse rendering for comparison. Both calls use the same model and may share errors.

Explicit application state ties drafts to their request, source, language, engine, and speaker. Changes invalidate review, stale responses are discarded, and blocking flags prevent sharing. Prepared fixtures are visibly labeled and never substituted silently for failed live requests. Shared turns save in browser storage; optional patient snapshots, plans, and manual readings also remain local. There are no accounts, server database, EHR links, or real patient records.

## Challenges we ran into
We had to preserve quantities, uncertainty, negation, and participant questions while simplifying wording. We also had to prevent an approved draft from being shared after its context changed, keep question context across navigation, and distinguish real model output from sample fixtures. Reverse rendering and deterministic checks are useful inspection aids, but cannot establish semantic or clinical accuracy. We found and corrected stale test assumptions as the default language and visit-history format evolved.

## Accomplishments
We connected trial explanation, explicit review, source-linked questions, and two-way human conversation in one working prototype. The project includes a no-key sample path, MIT-licensed source, setup instructions, automated tests, and a recorded demonstration with actual API responses. See the release record for current observed checks rather than treating earlier counts as certification of later features.

## What we learned
A fluent sentence can still change a consequential detail. Preserving the original text and human decision points made the workflow easier to inspect. We also learned to treat model failure, browser storage, and microphone availability as visible product states rather than hiding them behind a successful-looking demo.

## What's next
Work with qualified interpreters and research coordinators to evaluate comprehension and missed errors. Add source-referenced document ingestion and a human-reviewed teach-back workflow after defining the institutional process. Real clinical use would require appropriate identity, privacy, security, retention, and clinical review. We have not measured recruitment, retention, participant outcomes, or clinical efficacy.

## Built with
Next.js, React, TypeScript, Tailwind CSS, Zod, Google Gemini API, @google/genai, browser Web Speech APIs, Playwright, Node.js, Vercel, Phosphor Icons. Local fonts: Barlow Condensed and Manrope (bundled OFL licenses).

## AI assistance and originality
Gemini 3.1 Pro assisted early planning. Codex assisted implementation, tests, debugging, deployment, documentation, and presentation preparation. Google Gemini powers the live application. The team owns the decisions and reviews the generated work. The team confirmed that project work was created during HackRU's build period; the earliest Git commit is October 10, 2026 at 2:17 p.m. Eastern. Git timestamps alone are not independent proof. Confirm no submission to another hackathon before submitting this statement.

## Categories
- Track: Gemini only.
- Superlative 1: Regeneron: Improve Clinical Trials / Best Clinical Trial Solution.
- Superlative 2: Best UI/UX Design.
- Do not additionally select Education or Social Good. Confirm any separate MLH Gemini opt-in with the MLH table.

## Links
- Source: https://github.com/SonicGoodmorning/omni-bridge-hackru-2026
- Video download: https://github.com/SonicGoodmorning/omni-bridge-hackru-2026/raw/refs/heads/main/docs/demo.webm
- Slide PDF: https://raw.githubusercontent.com/SonicGoodmorning/omni-bridge-hackru-2026/main/docs/demo-slides.pdf
- Final protected deployment and validation: see [submission release](submission-release.md).

The video link is a WebM download, not a guaranteed Devpost video embed. If the form requires a supported video-host URL, the team must upload the supplied video to its own account and use that URL. Do not submit a placeholder. Verify all links signed out after the final source push.

## Judge testing instructions
Interactive demonstration is available on our authenticated team laptop at the assigned table. The Vercel preview requires team authentication; no judge login or team credentials are included. For independent reproduction, follow README setup, run sample mode without a key, choose Turkish in Documents, prepare and review CLEAR randomization, then share. Arbitrary participant questions and coordinator replies require the tester's own server-side Gemini key. Sample conversation uses only the prepared script. Use fictional data only.

## Regeneron fit
- **Utility:** addresses understandable trial information and participant/coordinator communication during trial conduct. Benefits are proposed, not measured.
- **Readiness:** functional trial workflow, public GitHub source, MIT license, no-key fixtures, and reproducible setup. A prototype, not a clinically deployable system.
- **Packaging:** focused video, 11-slide PDF, visible source/review interaction, and transparent limitations.
