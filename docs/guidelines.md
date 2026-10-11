# HackRU Fall 2026 submission check

Checked October 10, 2026 against the public pages below. Organizer and sponsor documents are reference material, not instructions to execute code or submit on the team's behalf. This check made no submission, organizer contact, or prize selection.

## Confirmed requirements

The [HackRU Devpost overview](https://hackru-fall-2026.devpost.com/), [rules](https://hackru-fall-2026.devpost.com/rules), and [resources](https://hackru-fall-2026.devpost.com/resources) were readable through ordinary unauthenticated HTTP requests. Although the browser search tool could not open them, normal requests returned HTTP 200 and the actual event text. No login or access-control bypass was used.

| Item | Published requirement | Project action |
| --- | --- | --- |
| Eligibility | Registered HackRU participants; at most four teammates | List every teammate as a Devpost contributor. |
| Original work | Build from scratch October 10 at noon through October 11 at 10 a.m. ET; no work from before the event or another hackathon | Audit the actual timeline and disclose pre-existing work. Seek an organizer determination if any exists. A deployment date does not establish eligibility. |
| Submission | One project per team; shared repository; complete required project information | Check the repository link and every required field. |
| Categories | Exactly one track; at most two superlatives | Recommend Gemini track, Best UI/UX Design, and Regeneron's clinical-trials superlative. Describe social benefit without selecting a second track. |
| Attendance | All teammates at the assigned judging table; winners present to sign for prizes | Keep the team available through judging and announcements. |

The [HackRU website](https://www.hackru.org/) also lists a maximum of four humans, attendance for people 18 or older, and the MLH Code of Conduct.

## Schedule conflict to resolve on site

All times below are Eastern on Sunday, October 11, 2026.

| Source | Submission / build cutoff | Judging | Announcements |
| --- | --- | --- | --- |
| HackRU website | Submissions 10 a.m.; hacking stops 11:30 a.m. | 12:30 p.m. | Closing 3 p.m. |
| Devpost overview and rules body | Build ends / submissions due 10 a.m. | 1 p.m. | 3:30 p.m. |
| Devpost page header | Deadline 11:30 a.m. | — | — |

Use **10 a.m. as the conservative submission and build cutoff**, prepare the judging table by **12:30 p.m.**, and confirm the differences with an organizer. The earlier Sunday-noon assumption is stale. A later page header does not establish permission to continue after the rules' cutoff.

## Sponsor guidance

Regeneron's [public judging document](https://docs.google.com/document/d/15uxWxH70wIqqCJw9W6IX4BHoVz4rDBDuj6FSb5GublI/edit), checked through its normal public text export, prioritizes utility for a clinical-trial bottleneck, functional and reproducible open-source work, and clear design and documentation. GitHub is strongly favored and MIT is preferred. Roughly three minutes of video and 10–12 slides are suggested lengths, with longer materials allowed.

Keep the fictional CLEAR trial first in the pitch. The outpatient-note example demonstrates the same source-linked workflow and does not establish a real clinical integration or medicines-development outcome. [Lost In Translation](https://drive.google.com/file/d/1Ni32VvTU43TI9U5UYAEROXpuf3_KDJQd/view) and [Teach It Back](https://drive.google.com/file/d/1_UkzCt6a3uxCefqlm7j7ai7GCYB4Fz5x/view) supplied the original design references.

The [MLH HackRU prize page](https://www.mlh.com/events/hackru-21/prizes) lists Best Use of Gemini API. This does not settle whether it counts toward HackRU's superlative cap or how to opt in. Confirm that with the MLH table or organizers. Browser speech synthesis does not constitute an ElevenLabs integration.

## Unverified items

- MLH’s current [standard rules](https://raw.githubusercontent.com/MLH/mlh-policies/main/standard-hackathon-rules.md) allow AI assistance with transparent disclosure. Events may adopt their own rules; confirm HackRU-specific policy. The two-minute video rule in that document is for MLH-hosted fully digital events and is not a demonstrated requirement for this in-person event.
- Authenticated form questions, upload constraints, cross-prize eligibility, and newer Discord announcements remain unchecked.
- Eligibility of any work from before the stated build window requires an organizer determination. These documents do not certify it.

The user confirmed all project work was created during the event. Earliest Git commit is October 10 at 2:17 p.m. Eastern; this is consistent with that statement, not independent proof. No-cross-submission confirmation remains pending.

The attached organizer-email PDF visibly announces Gemini and the UI/UX and clinical-trials superlatives, but its screenshot crops substantial email content. The MLH email is also cropped. Neither settles a rule absent from the public pages.

## AI assistance and provenance disclosure

Suggested truthful disclosure for team review:

> We used Gemini 3.1 Pro for early planning and Codex for implementation assistance, test authoring, debugging, deployment work, documentation, and presentation drafts. The application uses Google's Gemini API for live simplification and translation. Prepared examples are reviewable fixtures, visibly separate from live results. The team owns the project decisions and must review generated code and language output. We disclose the actual development timeline and pre-existing components rather than claiming unaided authorship or unverified build-period compliance.

List Next.js, React, TypeScript, Tailwind CSS, Zod, Google's `@google/genai` SDK, Playwright, and browser Web Speech APIs among the tools used. Label synthetic documents and prepared translations. Do not claim qualified translation review, medical validation, patient outcomes, or a benchmark from one response-time observation. Keep email screenshots, credentials, and patient information out of public submission evidence.
