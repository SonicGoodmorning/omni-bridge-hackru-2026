# SayAhh redesign verification

Locally verified on October 10, 2026 using the Codex in-app browser and Next.js 16.4.0. This is a presentation migration; deployment remains a separate release action. Existing feature work in this checkout was preserved.

## Delivered system

SayAhh wordmark and A favicon, locally loaded Barlow Condensed and Manrope, shared graphite/icy blue tokens, Phosphor icons and compact top navigation. All seven screens use the same light/dark palette and control styles. Numbers retains six selectors, the selected trend, a labelled days-logged ring and reading history. Conversation, jargon and documents retain distinct source, explanation and review surfaces. Profile, plan and history retain their existing saving and clinical review choices.

Runtime values and interaction ownership are documented in [DESIGN.md](../DESIGN.md) and [UX-CONTRACT.md](../UX-CONTRACT.md).

## Screen matrix

Each cell represents a screenshot and a rendered DOM layout check. Desktop was 1266 × 924; phone was 390 × 844.

| Screen | Desktop light | Desktop dark | Phone light | Phone dark |
| --- | --- | --- | --- | --- |
| Conversation | Pass | Pass | Pass | Pass |
| Explain jargon | Pass | Pass | Pass | Pass |
| Patient profile | Pass | Pass | Pass | Pass |
| My numbers | Pass | Pass | Pass | Pass |
| Action plan | Pass | Pass | Pass | Pass |
| Documents | Pass | Pass | Pass | Pass |
| Visit history | Pass | Pass | Pass | Pass |

Final checks show no document-level horizontal overflow. Header measurements are 72px at desktop and 60px at phone width. The exact 1200px/1199px boundary was also checked: 72px/60px, with no root overflow. A mobile Numbers table overflow found during inspection was corrected and rechecked in both themes. Native select/date widgets remain platform-owned.

## Focused workflows

- Compact Menu shows routes and engine settings, retains active navigation, dismisses with Escape and restores focus. Opening Visit history from Menu and closing its modal also returns focus to Menu.
- The reading dialog receives focus, allows keyboard traversal and cancels with Escape without writing an entry. Its position and scrolling were checked on a phone viewport.
- Profile selection loads the remembered Ege edits. Saving the unchanged profile shows persistent inline confirmation. Ege remains the only selectable prepared profile.
- Existing manual readings, profile preferences and theme survive reload. Separate profile and numbers retention choices remain selected as before verification.
- Five existing visits and two saved-plan records remain visible, including their snapshot and checkmark metadata. Historical snapshots are retained independently of the current profile picker.
- Visit search, no-results feedback and clear-search focus were checked. No visit was deleted or renamed during verification.
- A long fictional sample draft retained its text after an unsupported-sample error; retry and cancellation controls remain visible. A supported sample showed pending state, original/reverse translation and review flags. Share stayed disabled until its review checkbox was selected. The draft was not shared, so verification added no transcript turn.
- Document source, review and participant tabs were exercised on phones. Source links remain in the markup. Arabic and Urdu participant output retained their respective language and RTL direction without page overflow.
- Ege, Turkish output, live-engine selection and the dark theme were restored after the checks. No real medical details were sent to Gemini during this verification.

## Commands and limits

- `npm run typecheck`: passed.
- `npm run build`: passed; all existing page/API routes compiled.
- `git diff --check`: passed.
- CSS parse checks: passed for the rewritten screen styles.
- DESIGN.md lint: zero errors and zero warnings.
- No broad test suite or presentation generation was added or run for this redesign.

The strict premium UI static audit retains four `form.novalidate-missing` findings in the existing jargon, profile, reading and rename forms. This is an explicit compatibility exception in UX-CONTRACT.md: adding `noValidate` would change browser constraint behavior outside the approved visual scope. The forms retain their existing native validation and application errors.

One older saved-plan fixture was retained but refused restoration by the existing transcript/language/AI-context mismatch guard. Its saved copy was unchanged. A successful checklist restoration for that legacy fixture is therefore not claimed; resolving its context fingerprint would require separate domain/data work.

These checks are focused local verification, not a full accessibility certification or a cross-browser/device audit. Live model responses, audio hardware and release deployment were not exercised.

## Screenshot evidence

Screenshots are stored outside the repository to avoid committing patient-profile contents. The local evidence directory is `/private/tmp/sayahh-review/`.

- [Desktop overview, both themes](/private/tmp/sayahh-review/overview-1266.jpg)
- [Phone overview, both themes](/private/tmp/sayahh-review/overview-390.jpg)
- [Numbers, dark desktop](/private/tmp/sayahh-review/numbers-dark-1266.png)
- [Numbers, complete page](/private/tmp/sayahh-review/numbers-dark-full.png)
- [Conversation, light phone](/private/tmp/sayahh-review/conversation-light-390.png)
- Per-screen files follow `{screen}-{theme}-{1266|390}.png`; Arabic and Urdu checks are `documents-ar-SA-390.png` and `documents-ur-PK-390.png`.
