# Interview Loop MVP

A zero-build, browser-only MVP for holistic technical interview preparation. It is intentionally useful without credentials: the local interaction model provides a timed, multi-round virtual onsite with responsive follow-ups and an end-of-loop report.

## Run locally

Each interview round now selects its tools automatically: coding has a JavaScript runner in a worker with a three-second timeout; system design has a touch-enabled whiteboard with labels, undo, and PNG export; project interviews accept PDF decks, PPTX decks (text extraction), and slide images. PPTX text extraction loads JSZip from jsDelivr; PDF export preserves original PowerPoint formatting. Drafts remain available across follow-up turns. The runner executes JavaScript only and is not a multi-language compiler service.

Serve the `dist` directory with any static server. For example:

```sh
cd /Users/mickeyliu/Workspace/interview-loop
python3 -m http.server 4173 --directory dist
```

Open `http://localhost:4173`.

## What works without API keys

- Company, role, and level selection
- Three realistic technical rounds: algorithms, systems reasoning, and technical collaboration
- Timer, interviewer personas, answer transcript, shared code workspace, and adaptive follow-up state
- Text-first interview flow that remains usable if camera/mic/AI services are unavailable
- Scorecard, coaching feedback, next-practice suggestion, and visible sourcing safeguards

## Enabling live AI and voice

The static MVP deliberately has no secret-bearing API route. In production, add a server-side `/api/session` that creates a short-lived provider session and gives the client only an ephemeral credential.

Required server environment variables:

```sh
OPENAI_API_KEY=...             # live conversational interviewer / transcription
VOICE_PROVIDER_API_KEY=...     # optional text-to-speech provider, e.g. ElevenLabs
```

Suggested production flow:

1. Browser obtains microphone permission and opens a WebRTC or WebSocket session through your server.
2. The server creates an ephemeral AI session scoped to the chosen role, round rubric, and safety instructions.
3. The client streams audio, renders transcript and TTS/avatar state, and keeps text input available at all times.
4. The server stores only consented session artifacts, scores against a disclosed rubric, and lets the user delete them.

Never ship `OPENAI_API_KEY` or another provider secret to the browser. Configure those variables as platform secrets, not checked-in `.env` values.

## Public question-intelligence pipeline

The product UI describes the policy; this is the implementation contract for a production ingestion service:

1. **Discover:** collect only publicly accessible GitHub repositories/issues, public Reddit discussions when allowed by the relevant terms and API, company-published engineering content, and other public pages permitted for retrieval.
2. **Record provenance:** save source URL, canonical source ID, retrieved timestamp, publisher, license/terms outcome, company/role tags, a short non-infringing summary, and an attribution link. Do not bulk-copy posts or scrape around login/paywall/robots controls.
3. **Screen:** reject private, leaked, confidential, paywalled, restricted, personally identifying, or copyright-sensitive material. Honor deletions and source restrictions.
4. **Normalize:** deduplicate by semantic cluster, extract skills and round types, and create original question templates instead of reproducing source language.
5. **Score:** calculate `confidence` from independent corroboration, source quality, recency, and human review. Apply a freshness decay and display the data date. Confidence describes the pattern, not whether a specific employer will ask a question.
6. **Review:** route high-impact or company-specific clusters to human review; keep an audit record of the decision and source links.
7. **Generate:** retrieve only approved templates plus provenance metadata at interview time. Clearly label prompts as practice simulations, never as verified, current, proprietary, or authentic interview questions.

Example record shape:

```json
{
  "template_id": "systems-cache-001",
  "skill_tags": ["caching", "latency", "tradeoffs"],
  "company_scope": "generalized",
  "source_links": ["https://github.com/example/public-discussion"],
  "retrieved_at": "2026-10-13T00:00:00Z",
  "freshness_days": 14,
  "confidence": "medium",
  "human_reviewed": true,
  "copyright_status": "metadata-and-summary-only"
}
```

## Deploy

Publish the contents of `dist/` with any static host. This standalone source repository excludes the original private hosting identity and deployment archives.
