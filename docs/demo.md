# Three-minute integrated demonstration

Use the team's tested laptop and one shared browser session. Begin with the fictional CLEAR trial, then show the participant asking a question and the human coordinator replying. The original document remains visible. A fictional outpatient note is a short second-source example, not a real prescription or patient record.

Preflight the deployed URL, Vercel access, network, and Gemini quota. Use Turkish for the main story because a teammate can inspect it directly; do not claim completed qualified language review. Keep typing available even if the microphone works. Use [the editable 11-slide HTML deck](demo-slides.html).

## Recording plan

| Time | Screen and action | Suggested narration |
| --- | --- | --- |
| 0:00–0:15 | Title, then Document guide with CLEAR and Turkish selected | “SayAhh connects understanding a trial with asking the next question. This is a fictional education demonstration.” |
| 0:15–0:40 | Select randomization. Prepare a labelled sample if conserving quota. Show source, translation, English rendering, and flags. | “The source says there is a 50% chance of either group, and neither person chooses. The coordinator sees a draft first. This prepared example is labelled Sample mode.” |
| 0:40–0:55 | Review and share. Show the participant explanation and source paragraph. | “Sharing releases this exact draft. The source link returns us to the wording we are discussing.” |
| 0:55–1:15 | Attach a Turkish question to the source paragraph and open Conversation. Select Gemini live visibly. | “The participant can ask in their own language. The editable question and paragraph context remain while we switch into live translation.” |
| 1:15–1:45 | Translate the participant question with Gemini live visibly selected. Show the actual result or error. Review/share if releasable. | “This segment makes a fresh live request. Gemini translates the participant's own words into English, then separately renders that translation back. It does not answer the question.” |
| 1:45–2:10 | Human coordinator types or speaks a short reply. Correct recognized text if needed, translate, review, and share. | “The human coordinator supplies the reply. English travels back to Turkish through the same review step. Typing remains available.” |
| 2:10–2:30 | Return to Document guide. Show the fictional visit summary and a source-linked explanation with its engine label. | “The same session can explain this fictional follow-up note. Each paragraph stays attached to its source. The explanation describes the documented plan without creating a new one.” |
| 2:30–2:45 | Enlarge text in Reading preferences. Briefly show all language choices. | “Reading preferences change the display without rewriting reviewed text. The prototype supports 16 live language choices and six prepared sample languages.” |
| 2:45–3:00 | Closing slide, repository, limitations | “We built a connected, inspectable workflow. Translation quality, real speech behavior, and clinical use need further review. Our repository discloses AI assistance, observed tests, and limitations.” |

Switching engines clears translated/shared work and requires fresh review, while retaining the editable speaker question and its paragraph context. Show that change honestly. Starting in live mode is also possible when quota allows.

Never conceal a live failure or splice sample output under a live label. If generation exceeds the timing slot, show truthful loading and extend the take or edit idle time with a caption. A recorded live segment is only a live success when its actual request succeeds. Its elapsed time describes that request, not typical performance.

## Reproducible live exchange

Participant question in Turkish:

```text
Bu kurgusal çalışmaya katılmak zorunda mıyım?
```

The intended English meaning is “Do I have to participate in this fictional study?” Inspect the actual returned text. Do not insert that expected meaning into the recording as if Gemini returned it.

The human coordinator can provide this reply based on the fictional source:

```text
Taking part is your choice. You may leave at any time without penalty. Leaving will not affect your regular care.
```

Use live mode for this arbitrary exchange. For the fixed sample pipeline, use **Use next sample turn**. It fills a supported utterance while translation, review, and sharing remain explicit. **Open prepared conversation** loads all eight fixture turns without individual review and labels that distinction.

## Sample backup

If quota or connectivity prevents live translation, leave the visible error in the take, say “Live translation is unavailable in this run,” and switch explicitly to Sample mode. Use the prepared placebo question and human reply, or open the prepared conversation and explain that it contains fixed examples. This demonstrates the workflow, not current live availability.

The outpatient note has a prepared fixture. Arbitrary pasted synthetic text needs live mode, acknowledgment, and at most 4,000 characters. Uploads, OCR, EHR links, real documents, and generated medical answers are outside this build.

## Questions to prepare for

**What does Gemini contribute?** Live calls explain source paragraphs and translate human turns. A fresh second request creates a reverse rendering from only generated target text. Both requests use the same model and can share errors.

**Who answers the participant?** The human clinician or coordinator. The app translates each person's own words.

**Why show sources?** Reviewers can inspect the exact paragraph behind an explanation and attach a question. A source link alone does not prove faithful translation.

**What has been evaluated?** Report current recorded checks and actual live observations only. Browser speech mocks do not evaluate real recognition accuracy. All supported languages need qualified review. No patient outcome or clinical validation has been established.

**What is stored?** Drafts and document explanations stay in page memory. Shared turns save automatically in unencrypted browser storage; patient snapshots, plans and numbers have optional local saving. There are no accounts or server database. Live text goes to Gemini. Browser speech recognition may use a remote service. Do not enter patient information.

## Submission materials

Regeneron suggests roughly three minutes of video and 10–12 slides. The updated HTML deck contains 11 slides. The current PDF has 11 rendered and visually inspected pages. The silent captioned recording is 2 minutes 40.68 seconds and includes actual live trial, participant-question, and coordinator-reply operations, followed by a labeled visit-note sample. See [capture metadata](demo-capture.json) and [actual responses](integrated-demo-qa.json). The recording script operates review controls for demonstration; it does not establish human language review. Team review and narration remain available before submission.

Use [the guidelines check](guidelines.md) for the one-track/two-superlative limit, build-period provenance, and schedule conflicts. Treat 10 a.m. Eastern on Sunday, October 11 as the conservative submission/build cutoff and confirm judging on site. Complete Devpost fields, list every teammate, review the AI-assistance disclosure, and verify judge access to all links.

To reproduce the capture, install the Playwright video encoder (`npx playwright install ffmpeg`), start a production build on port 3003, and run `node scripts/record-demo.mjs`. `DEMO_URL` and `PLAYWRIGHT_CHROME_PATH` override local defaults. Use `--sample` only for an explicitly labeled fixture recording, or `--screenshots-only` for stills. Live mode uses your configured server key and never mocks model responses.
