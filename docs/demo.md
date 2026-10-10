# Three-minute demonstration

Use a laptop with a browser known to support microphone recognition, if demonstrating speech. Keep typed input available. Prepare `localhost:3000` and a second browser tab with `docs/demo-slides.html`. The entire scenario uses a fictional trial and consenting teammates.

Decide before recording whether you are demonstrating **sample** or **live Gemini**. Show the engine label on screen and say which one it is. Without a key, use the fixed sample text below. Do not narrate stored sample output as a fresh Gemini response. If a live request fails, explain the error and explicitly switch to the labelled sample walkthrough.

## Script and timing

| Time | Screen / action | Suggested narration |
| --- | --- | --- |
| 0:00–0:20 | Show title and both modes | “Omni-Bridge helps a research coordinator explain a study across languages. We built two equal workflows: understanding a consent document, and reviewing a spoken explanation. This demonstration uses a fictional trial.” |
| 0:20–0:35 | Consent guide; choose Spanish and Group assignment | “The original stays visible. In CLEAR-026, the participant has a 50% chance of either group. A placebo has no active study drug, and benefit is not guaranteed.” |
| 0:35–1:05 | Generate a draft; show source, Spanish explanation, back-translation and flags | “This is [a fixed sample / a live Gemini result]. The coordinator compares the original with the English back-translation and review flags. These checks can miss errors, so the result stays a draft.” |
| 1:05–1:20 | Release after inspection; switch to Visits or another language | “Only the coordinator's release puts this explanation on the participant side. Changing the section or language invalidates the earlier draft.” |
| 1:20–1:40 | Conversation bridge; speak the fixed text or paste it | “For a conversation, speech becomes an editable transcript. The coordinator checks it before sending. Typed input supports browsers or rooms where speech recognition is unavailable.” |
| 1:40–2:15 | Correct transcript if needed; send; inspect and release | “The same review step applies here. Live mode makes a separate back-translation request without the original English. That improves inspectability, but using the same model does not provide independent clinical verification.” |
| 2:15–2:35 | Show the five language choices and clear engine label | “The prototype includes Turkish, Spanish, Brazilian Portuguese, Hindi, and simplified Chinese. All five need qualified human language review. Turkish team review is pending. We are not claiming validated translations.” |
| 2:35–3:00 | Show closing slide or return to the source | “The next work is review with interpreters and research coordinators, plus documented error tests. We keep the source and human discussion central. This prototype does not obtain consent, store a clinical approval, or give personal medical advice.” |

In live mode, generation latency can exceed these timing slots. Preflight the network and account quota; pause narration while showing a truthful loading state, or record a longer take and edit idle time without concealing failures or substituting sample output.

## Reproducible sample conversation

```text
You have a 50% chance of being assigned to either group. Neither you nor the researcher chooses the group. You may receive a placebo, which has no active study drug.
```

Speech recognition can change punctuation or numerals. Review and correct the text to the supported sample before sending. Use the live engine for arbitrary edited conversation.

## Questions to be ready for

**Why back-translation?** It lets an English-speaking coordinator inspect a second rendering of the target explanation. It can expose errors, but can also reproduce a shared error. A qualified person still must review the target language directly.

**Why five languages?** They demonstrate script and locale differences in the interface. They are prototype choices with pending language review, not a claim that every translation is ready for patients.

**Where does Gemini matter?** In live mode it simplifies the reviewed source, translates it into the chosen language, and returns a separate English back-translation through the server. Sample mode is an openly labelled fixture for reproducible demonstrations.

**Is this real informed consent?** No. The fixture is fictional. The interface supports education and a coordinator's review; it contains no signatures and cannot establish informed consent.

**How do you measure success?** Start with the documented planted-error cases and honest detection results. Then ask qualified language reviewers and research coordinators whether key concepts remain accurate and easy to explain. No clinical outcome or accuracy result has been established by this demo.

## Deliverables

The local HTML presentation has 11 slides, with an exported PDF included. The [silent, captioned walkthrough](demo.webm) lasts 3 minutes and 0.68 seconds and demonstrates fixed Prepared sample output and the review/release workflow. It does not show live Gemini generation or validate real microphone behavior; actual live requests are documented in [the QA report](live-qa.json). Before submission, verify the current organizer form and sponsor requirements, include a reproducible repository, and remove all credentials and personal material. Regeneron describes a roughly three-minute video and 10–12-slide deck as suggested lengths, not hard limits.
