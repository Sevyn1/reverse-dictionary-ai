# Verification scope

- 20 Python/FastAPI/SQLite tests passed.
- 3 React UI tests passed.
- React production build passed.
- Local mode works without credentials; the OpenAI provider path is mocked in tests.
- Real OpenAI calls, model quality, deployment, large-vocabulary performance, and embedding search are not verified or claimed.

The original source was later recovered from iCloud: a Flask/OpenAI prototype with unfinished Spring scaffolding. This repository is the modern portfolio rebuild with explicitly documented AI assistance.

Final browser checks verified description-to-word search, the missing-key error for OpenAI mode, and responsive layouts. Hosted CI passed: https://github.com/Sevyn1/reverse-dictionary-ai/actions/runs/37262488172.


## Provider diagnostics — 5 October 2026

The local server was restarted with a user-supplied credential held in memory, outside source files. A live provider request returned HTTP 401 with error code `invalid_api_key`; successful live reranking is therefore not verified. The application now distinguishes rejected credentials, permissions, insufficient quota and rate limiting without returning provider messages or credential fragments. The backend suite now passes 24 tests.
