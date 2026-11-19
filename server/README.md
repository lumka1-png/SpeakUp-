# SpeakUp! API server

See the main README (`../README.md`) for setup, endpoints, and deployment.

* `src/prompts.ts`: the instructions Claude follows for feedback and podcasts
* `src/schemas.ts`: request validation and the JSON shapes Claude returns
* `src/claude.ts`: Claude API calls (structured output, refusal fallbacks, model setting)
* `src/app.ts`: routes, daily limits, and the reports CSV
