# SayAhh UI contract

The approved frontend redesign changes presentation only. Existing domain logic, APIs, schemas, routes, permissions and retention choices remain authoritative. The interface supports fictional hackathon discussions; it does not obtain clinical consent or replace a qualified interpreter.

## Sources and authority

| Concern | Source | UI consequence |
| --- | --- | --- |
| Approved scope and visual identity | User-approved SayAhh frontend redesign plan; DESIGN.md | Preserve behavior while replacing the visual system |
| Translation/review restrictions | docs/api.md; src/lib/visits/review.ts; src/lib/documents/types.ts | Keep original text, review flags, blocking states and explicit share action |
| Privacy / retention | README.md; src/hooks/use-patient-profile.ts; use-vitals.ts; use-visits.ts; use-action-plan.ts | Preserve opt-in profile/numbers/plan storage and visit snapshots |
| Deletion lifecycle | Existing owning hooks and confirmation components | Preserve the existing object-specific confirmation; no new deletion behavior |
| Locale / prepared-language availability | src/lib/types.ts; session-provider.tsx | Existing language choices, prepared availability and RTL output |
| Auth / billing | No account or billing flow exists | No new account, entitlement, payment or consent flow |

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Select/Listbox | Native `<select>` controls styled by shared tokens and their owning workspace | Navigation and input ownership below; premium-ui.json | Native browser/OS popup only | Keyboard selection, open popup, both themes and narrow viewport |
| Date | Native date and local date-time inputs in ActionPlanWorkspace and NumbersWorkspace | Navigation and input ownership below; existing date parsing and validation in owning hooks | Native date; native datetime-local | Calendar/keyboard entry, local-time meaning and existing invalid-date rejection |
| Form | Existing workspace forms, field constraints and owning save/validation hooks | Existing profile, vitals, jargon and history hooks; presentation-only compatibility exception below | Preserve current native constraint validation plus application errors; no validation migration | Entered values, invalid input, save/cancel feedback and no duplicate pending submission |
| Scrollbar | Global standards properties and WebKit fallbacks in src/app/globals.css | DESIGN.md tokens and global application stylesheet | Shared baseline; workspace-owned scroll geometry | Root computed styles, visible operable scrollbars, both themes and narrow viewport |
| CRUD | Existing profile, vitals, action-plan and conversation-history hooks with their owning workspace controls | Workflow ledger below and source hook contracts | Save in place; reading dialog closes on save; existing object-specific deletion confirmation | Save/reopen, cancel, deletion scope and unchanged local-storage identifiers |

## Screen owners

| UI family | Owner |
| --- | --- |
| Palette, type aliases, status and shape | src/app/theme.css; DESIGN.md |
| Baseline controls, focus, motion, scrollbars | src/app/globals.css |
| Navigation, language, engine, theme, reading preferences | AppShell; SessionProvider; useTheme; session.css |
| Profile, sample selection and saving | PatientProfileWorkspace; SampleProfiles; usePatientProfile |
| Readings, trend, editing and independent saving | NumbersWorkspace; useVitals |
| Conversation, review and participant display | VisitsWorkspace; its existing review/display dialog variants; useVisits |
| Jargon input / explanation / review | JargonWorkspace; useJargonExplanation |
| Documents and source references | DocumentWorkspace; useDocuments |
| Plan evidence, review and progress | ActionPlanWorkspace; useActionPlan |
| Visit history, search, rename and deletion | SavedConversations; useConversationHistory |

Screen-specific styles must not redefine shell breakpoints or implement another theme palette. Extend canonical owners for repeated interactions.

## Navigation and input ownership

The header is 72px at >=1200px and 60px below. Compact navigation moves into the labelled Menu, including engine settings. Links preserve routes and active-page indicators. Menu is a non-modal disclosure: ordinary Tab navigation, outside click dismissal and Escape returning focus to Menu. Reading preferences and Help retain their existing disclosure behavior.

All selects are **native**: operating-system popup geometry, locale and keyboard behavior are accepted. This includes language, engine, profile, chart range and history controls. Dates/datetimes are **native**: browser-owned calendar/input behavior is accepted, including platform locale. Do not introduce replacement listboxes or date libraries for visual consistency.

Textareas use shared `resize: none`, sufficient initial height and scrolling for long input. No native validation behavior is changed in this presentation-only migration: existing form constraints and application errors remain in effect. This explicit compatibility exception avoids modifying validation/domain rules under a redesign request. No `reportValidity()` or browser alert/confirm/prompt UI is introduced.

## Workflow ledger

| Flow | Pending / failure | Success / next destination | Source |
| --- | --- | --- | --- |
| Translate conversation | Existing busy/cancel, inline error and retry; entered text retained | Draft review; sharing only after existing review requirements | use-visits.ts; visits-workspace.tsx |
| Review draft | Original and reverse translation, warnings and blockers visible | Explicit sharing adds participant output / transcript | src/lib/visits/review.ts |
| Explain jargon | Existing pending/cancel and inline error | Plain-language explanation and notes; stays outside clinician transcript and plan | use-jargon-explanation.ts |
| Explain documents | Existing pending/cancel/retry; source retained | Review before participant display; source links remain available | use-documents.ts |
| Edit profile | Existing validation and unsaved feedback | Save in place; Remember remains optional | use-patient-profile.ts |
| Edit readings | Existing app-owned dialog and validation | Save closes dialog and updates current metric; numbers saving remains separate | use-vitals.ts; numbers-workspace.tsx |
| Generate plan | Existing busy/cancel/retry and blockers | Review before checklist/download; saving remains optional | use-action-plan.ts |
| Search history | Local transient filtering; clear resets immediately | Open/rename/delete keep owning hook behavior | use-conversation-history.ts |

## Feedback, dialogs and accessibility

Keep error, warning, saved and blocking feedback inline, with text, role/status and semantic colour. Critical instructions never exist only in a transient toast. Duplicate submits remain disabled during pending work. Cancellation and retry retain their original actions.

Existing native `<dialog>` elements are app-owned modal surfaces with accessible names, Escape handling, focus placement/restoration and bounded scrolling. The desktop conversation review panel is the existing non-modal variant; compact review remains modal. Do not claim modal isolation for a persistent pane. Destructive confirmation retains explicit object and consequence labels.

Use native links/buttons and labels. Visible focus is shared; sticky-header scroll margins keep fields reachable. The skip link targets workspace content. Enabled targets provide hover/active styles; disabled targets cannot invoke actions. Target WCAG 2.2 AA. This redesign's checks are focused local browser checks, not a complete accessibility certification or cross-device validation.

## Data and multilingual compatibility

Persisted identifiers intentionally retain their old namespace. Never rename `omni-bridge-theme`, `omni-bridge-patient-profile-v1`, `omni-bridge-patient-profiles-v1`, `omni-bridge-numbers-v1`, `omni-bridge-action-plan-v1`, `omnibridge.conversation.v1`, `omnibridge.conversations.v2` or `omnibridge.visits.v3` for branding.

Ege remains the only selectable prepared person. `sample-aylin` / `aylin` are stable identifiers; the removed profile migration remains unchanged. Existing readings, saved profile preferences, visit snapshots, plans and theme restore through the same hooks.

Patient output retains all existing languages, including Arabic/Urdu `dir="rtl"`; product controls remain English where previously English. Reading size applies to output. Native date popup language follows the browser. History search stays transient and local because clinical text should not be added to URLs.

## Verification and release

Verify all seven screens in both themes at desktop and 390px. Inspect narrow navigation, native controls, focus, dialog cancellation, long text, errors, empty/pending states, source links and review requirements. Compare stored profile and reading values before/after reload without overwriting user data. Run TypeScript and production build. No broad test suite, presentation regeneration, deployment, API or schema migration belongs to this redesign.
