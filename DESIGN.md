---
version: alpha
name: SayAhh
colors:
  background: "#F4F7FA"
  surface: "#FCFDFE"
  text: "#15202B"
  primary: "#22659A"
  dark-background: "#111820"
  dark-raised: "#1A2430"
  dark-text: "#EDF3F8"
  dark-muted: "#A7B4C3"
  dark-accent: "#86C5F7"
typography:
  heading:
    fontFamily: "Barlow Condensed, Arial Narrow, Arial, sans-serif"
    fontWeight: 600
  body:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: 14px
    lineHeight: 1.6
rounded:
  control: 8px
  panel: 12px
spacing:
  unit: 8px
  section: 32px
  panel: 24px
components:
  navigation:
    height: 72px
    backgroundColor: "{colors.background}"
    textColor: "{colors.text}"
  compact-navigation:
    height: 60px
  control:
    height: 40px
    rounded: "{rounded.control}"
  primary-action:
    height: 44px
    backgroundColor: "{colors.primary}"
    rounded: "{rounded.control}"
  dark-panel:
    backgroundColor: "{colors.dark-raised}"
    textColor: "{colors.dark-text}"
  dark-shell:
    backgroundColor: "{colors.dark-background}"
    textColor: "{colors.dark-muted}"
  dark-action:
    backgroundColor: "{colors.dark-accent}"
---

# SayAhh design system

## Overview

SayAhh is a patient communication product, with a precise, sporty and approachable register. Its core visual reference is WHOOP's at-a-glance metrics followed by deeper detail: [WHOOP home screen](https://www.whoop.com/us/en/thelocker/the-all-new-whoop-home-screen/). Clinical review screens use familiar product patterns with readable text and visible evidence. DESIGN_VARIANCE 4 / MOTION_INTENSITY 3 / VISUAL_DENSITY 5.

The user approved this system as a full frontend redesign. Avoid marketing filler, faux health scores, decorative illustrations, gradients, glass effects and animated counters. Preserve the established product routes, language output and review workflow.

## Colors

Runtime CSS is canonical (Model B): `src/app/theme.css` owns both palettes; this document mirrors accepted values. All screen styles reference those semantic variables, without separate per-screen dark overrides. Change the runtime and this contract together.

| Role / runtime token | Light | Dark |
| --- | --- | --- |
| Background / `--background` | #F4F7FA | #111820 |
| Panel / `--paper` | #FCFDFE | #17212C |
| Raised / `--surface-raised` | #EAF0F5 | #1A2430 |
| Text / `--foreground`, `--ink` | #15202B | #EDF3F8 |
| Secondary / `--muted` | #536577 | #A7B4C3 |
| Border / `--line` | #D2DDE7 | #344354 |
| Accent / `--teal` | #22659A | #86C5F7 |
| Accent hover / `--teal-dark` | #194E7A | #B5DCFB |
| Accent tint / `--teal-pale` | #E1EEF9 | #233B50 |
| On accent / `--on-accent` | #FFFFFF | #111820 |
| Participant surface / `--participant` | #EAF2F9 | #1A2B3B |
| Warning / `--warning`, `--warning-bg` | #835309 / #FFF3D9 | #F0C67B / #382D1D |
| Danger / `--danger`, `--danger-bg` | #A23535 / #FCEBEB | #FFADAD / #3C252B |
| Success / `--success`, `--success-bg` | #28664B / #E6F3EC | #A0D9B8 / #20382D |

Legacy token names `--teal` and `--serif` are adapters for existing components, not green or serif styling. Numbers tokens alias the shared roles. Chart lines use the accent; grid lines use borders. Color never substitutes for a label, review flag or numerical reading.

## Typography

`src/app/layout.tsx` loads local, open-license font files through `next/font/local`. Barlow Condensed Semibold is used for restrained headings and the SayAhh wordmark. Manrope is used for body, form controls, explanations and clinical source text. Licensed fonts live in `src/app/fonts/` alongside their OFL notices. System fonts render scripts outside the font's coverage. Arabic and Urdu output retains explicit `dir="rtl"`.

Body/control text is generally 13–16px; patient explanations follow the existing reading-size preference (18/22/26px). Small metadata is secondary to accessible labels. Readings use tabular numerals. Do not use condensed type for clinical paragraphs or inputs. Ahh in the wordmark uses the accent; the favicon is a simple icy blue A.

## Layout

Use an 8px spacing rhythm, with 16px phone gutters and 24–40px desktop gutters. Main workspaces are naturally document-scrolling; bounded transcript/document panes own their internal scrolling where established. Do not force long profile forms into fixed viewport frames.

One 72px top header at widths >=1200px contains the wordmark, current navigation and shared controls. Below 1200px use a 60px header with language, theme and a labelled Menu. The menu contains all routes and engine settings. Active navigation has a visible indicator and `aria-current`.

My numbers shows six selectors in two columns beside the selected trend on wide screens. These stack at narrower widths, retaining two selector columns on phones. Reading history follows. Conversation pairs transcript and composer on desktop and stacks on phones. Documents retain their mobile tabs and source anchors. Profile field order and groups are retained.

## Elevation & Depth

Borders and flat semantic surfaces define hierarchy. Use `--shadow` only for floating menus and dialogs, and `--overlay` for modal backdrops. No background gradients, blurred glass or ambient glows. The sticky header is solid.

## Shapes

Controls use `--radius-control: 8px`; panels and dialogs use `--radius-panel: 12px`. Pills are reserved for compact tags, choices and status. Recording rings measure **days logged** only, with an explicit text label.

## Components

Canonical owners and behavior live in [UX-CONTRACT.md](UX-CONTRACT.md). Shared controls and scrollbar baseline are in `globals.css`; navigation is in `session.css`; saved-visit page and dialog styling are in `history.css`; palettes are in `theme.css`. Screen styles own only their layouts and semantic variants.

Phosphor regular-weight icons are mapped through `src/components/icons.tsx`; functional SVG charts and educational diagrams remain SVGs. Native selects and date inputs keep platform-owned popups. Menus and dialogs have solid surfaces, visible focus and reachable actions.

Enabled controls provide hover, focus, active and disabled states. Primary actions use accent with on-accent text. Errors and blocked instructions use danger; warnings and review requirements use warning, with text and icons. Saves use persistent inline status rather than decorative toasts. State transitions last about 140ms; only an actual pending spinner may loop. Respect `prefers-reduced-motion`.

Scrollbars use the shared thumb/track/hover/active tokens and remain visible. Forced-colors mode uses system scrollbar/focus styling. Do not hide overflow to conceal broken layouts.

## Do's and Don'ts

- Put the current task, readings and evidence before supporting details.
- Preserve cancellation, retry, privacy choices and review-before-sharing.
- Keep original wording, explanation and reviewer notes visually distinct.
- Keep long multilingual text wrapping and patient output directionality intact.
- Do not invent device connections, clinical targets, recovery scores or new workflow rules.
- Do not rename persisted keys or stable patient identifiers during a visual rebrand.
