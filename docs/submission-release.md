# SayAhh submission release

Release preparation: October 10, 2026 (Eastern). This record distinguishes observed development checks from outstanding team actions.

## Final application

- Protected preview: https://express-monsoon-5gkbxhw-2phuvkhv0-egegoodmorning-6248.vercel.app
- Source: https://github.com/SonicGoodmorning/omni-bridge-hackru-2026
- Application source revision: `5f52ef7`. This revision passed clean-checkout installation, 62 unit tests, production build, six sample API language checks, and no-key browser review/share. Later commits update submission evidence and media without changing application source.
- Vercel reported READY after a successful Next.js build. Signed-out access redirects to Vercel login; authenticated in-app browser access opens SayAhh. Authentication protection was retained.
- The team chose laptop-only interactive judging. No public unauthenticated app or judge credentials are offered.

## Observed checks

| Check | Result |
| --- | --- |
| Unit tests | 62 passed; includes explicit locale-mismatch rejection and non-vacuous review/retry tests |
| TypeScript | Passed `npm run typecheck` |
| Production build | Passed `npm run build`; Next.js 16.4.0 |
| Browser cases | 39 passed in the final full run (35.1 seconds) |
| Browser scope | Six-language prepared document/display paths, review gates, stale responses, storage restoration/deletion, mobile layout, mocked speech and provider failure |
| Hosted live workflow | Turkish CLEAR explanation, participant question into English, coordinator reply into Turkish, explicit sharing, and restoration of both shared turns after refresh passed in the authenticated browser |
| Clean checkout | `npm ci`, 62 unit tests, production build, six sample API languages, and browser review/share passed without a Gemini key; Live option disabled |
| Recording | Fresh 160.76-second captioned video; three actual HTTP 200 Live Gemini operations and one labeled sample; six representative frames visually inspected |
| Slides | 11-page PDF exported; all slides checked for overflow and visually inspected |
| Credential-shaped literals | None found in tracked/unignored small text files; private environment files excluded by Git and Vercel ignore rules |

The first failed unit test came from an old Turkish fixture in a now-English default session. Corrected tests explicitly set their language and assert that drafts were received before testing review/retry behavior. Browser updates follow the existing v3 visit library, retained history on New session, mobile menu engine selector, and page scrolling on mobile. No application behavior was weakened to pass those tests.

## Release evidence

- [Submission copy](submission.md)
- [Morning checklist](morning-checklist.md)
- [Editable deck](demo-slides.html) and [PDF](demo-slides.pdf)
- [Demo video](demo.webm), [actual recording responses](integrated-demo-qa.json), and [capture metadata](demo-capture.json)

See the recording timestamps in these artifacts. Recorded live generation and automated operation of review controls do not establish qualified language review.

## Local judging backup

```sh
npm ci
npm run build
npm run start -- --port 3003
```

Open http://localhost:3003/documents and choose Turkish and Sample mode. Prepare CLEAR randomization, inspect source and review aids, then explicitly share. Use Conversation's Try a sample → Open prepared conversation for the clearly labeled no-key backup. Arbitrary new questions require a private `GEMINI_API_KEY` in `.env.local`; never put it in Devpost or source. Sample mode does not provide an offline action-plan generator.

## Public handoff verification

Source and refreshed media were published to `main`. Signed-out HTTP checks returned 200 for the repository, video download, submission copy, and direct PDF. GitHub’s PDF preview briefly returned 503, so the submission copy uses the verified direct download. The protected app still redirects signed-out visitors to Vercel login.

## Team-owned checks still pending

- All registrations and contributor invitations, no cross-submission, authenticated Devpost fields and final Submit confirmation.
- Organizer resolution of schedule discrepancies and AI policy; MLH Gemini opt-in/category-cap clarification.
- Fluent teammate review of the actual Turkish demonstration and real microphone/playback checks on the judging laptop.
- If Devpost requires a supported hosted video URL, upload the supplied WebM to the team's video account and verify the resulting link signed out.

Use 9:30 a.m. Eastern on October 11 as the submission target, 10 a.m. as the conservative cutoff, and be ready at the table by 12:30 p.m.
