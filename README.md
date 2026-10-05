# Reverse Dictionary AI

[![Build and tests](https://github.com/Sevyn1/reverse-dictionary-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/Sevyn1/reverse-dictionary-ai/actions/workflows/ci.yml)

Describe a meaning and find words. AI word search is the default: a Python/FastAPI API asks OpenAI for words and concise definitions beyond the local vocabulary. If the AI request fails, the React interface automatically tries the small SQLite catalog and clearly labels those results as local.

A modern rebuild developed with Codex assistance and published in October 2026. The original Flask/OpenAI prototype and unfinished Spring scaffolding were subsequently recovered from the iCloud archive. This repository documents the current FastAPI/React implementation; see [project history](docs/PROJECT_HISTORY.md).

![Local search result](docs/preview.jpg)

## Implementation

- Local description-to-word retrieval over 40 original curated entries, with repeatable ranking and matched-term explanations.
- SQLite catalog, FastAPI input validation, and API documentation.
- React loading, empty-result, and error states; AI-first search with transparent local fallback.
- OpenAI word suggestions with schema validation, result limits, duplicate rejection, timeouts and actionable provider errors.
- The original catalog-only reranking algorithm remains available through API mode `rerank`.
- Tests exercise real HTTP and SQLite; model-provider tests mock responses and cost nothing.

Local mode uses keyword overlap and inverse document frequency over 40 words. It is **not embedding-based semantic search** and cannot find words outside that catalog. AI mode can suggest words outside the catalog, such as “aunt” for “the sister of my mother.” Generated terms and definitions are model suggestions, not independently verified dictionary entries. Local scores remain lexical ranking values, not probabilities or AI confidence.

## Run the app

Requires Python 3.12 and Node 22.12+ or 24+.

```sh
python -m venv .venv
# macOS/Linux; on Windows use .venv\Scripts\activate
. .venv/bin/activate
pip install -r requirements-dev.txt
cd frontend
npm ci
npm run build
cd ..
uvicorn backend.main:create_app --factory --host 127.0.0.1 --port 8081
```

Open http://127.0.0.1:8081. The API serves the built UI; API documentation is at `/docs` and health at `/api/health`. For frontend development, run `npm run dev` in `frontend` while the API runs on 8081.

Try “The sister of my mother,” “an unexpected fortunate discovery by chance,” or “the ability to recover after difficulty.” AI mode starts selected. Manual local mode remains available without a key.

## OpenAI configuration and verification

Set `OPENAI_API_KEY` in the **server environment**, then restart the API. `.env.example` documents names and is not loaded automatically. Never put credentials in React code or commit them. `OPENAI_MODEL` optionally selects a compatible model; the default is `gpt-4o-mini`.

AI mode sends the description to OpenAI and may incur charges, with at most 600 output tokens per request. Missing configuration or rejected credentials return 503; other provider failures return 502. The browser then tries local mode and shows a fallback notice. Invalid descriptions are not retried. The selected AI preference is retained for the next search; fallback results are labeled **LOCAL CATALOG**, not AI results. Direct API clients receive the provider error and control their own fallback.

**The original OpenAI reranking path was live-verified on three public sample descriptions on 5 October 2026**, using `gpt-4o-mini`. The first suggestions were serendipity, equanimity and resilience. This smoke check does not establish general search accuracy. Automated provider tests still use mocked HTTP; local retrieval works without a key.

## Verification

```sh
python -m pytest backend/tests -q
cd frontend
npm test
npm run build
```

36 backend tests and 6 UI tests pass, along with the UI build. Tests cover query limits, duplicate catalog initialization, deterministic results, missing keys, malformed model output, invalid IDs, quota errors, and timeouts. GitHub Actions runs these checks. See `docs/VERIFICATION.md` for the final recorded scope.

```sh
curl -X POST http://127.0.0.1:8081/api/search \
  -H 'Content-Type: application/json' \
  -d '{"description":"fortunate discovery by chance","limit":5,"mode":"local"}'
```

Responses identify the mode. AI suggestions include word, definition and `source: "openai"`, without invented lexical scores. Local/rerank suggestions include score and matched terms. Limits are 1–5 and descriptions 3–300 characters; unknown request fields are rejected. Query history is not stored by the application.

## AI assistance and interview review

Codex assisted with the implementation, tests, and verification. The source, setup instructions, and test boundaries make the work inspectable. This rebuild is separate from earlier coursework and project history.

Explain direct AI suggestion versus local retrieval, the local scoring limits, schema validation, automatic fallback, and which tests mock the provider. Useful next exercises are a larger vocabulary and an evaluation set of descriptions not copied from definitions. Embeddings and a broad held-out quality evaluation remain future work, not completed claims.

## Engineering decisions

See [design decisions](docs/DESIGN_DECISIONS.md) for the implemented choices, tradeoffs, and test boundaries.


### AI connection troubleshooting

A configured environment variable does not establish that the key is valid. Rejected credentials, project/model permission failures, API quota and rate limits are reported separately. Provider messages are withheld because they can contain credential fragments. A valid active API credential is required for AI word search and reranking. Three live sample searches passed with a replacement credential on 5 October 2026; credentials are not included in the repository.
