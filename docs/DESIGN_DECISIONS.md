# Design decisions

## Separate retrieval from generation

The local stage uses keyword overlap and inverse document frequency to rank a curated vocabulary. The optional model receives those candidates and reranks their IDs. This keeps returned definitions tied to catalog records and makes it possible to reject invented words. It also limits recall: the model cannot select a word the local stage did not retrieve.

## Name the mode accurately

Local mode is keyword retrieval, not vector or embedding search. OpenAI mode is an optional integration. Missing configuration and provider errors have explicit HTTP errors; the interface never labels an offline fallback as a successful model call.

## Validate both sides of the API

FastAPI validates description length, result limit, allowed modes, and unknown fields. The model adapter checks JSON structure, valid candidate IDs, uniqueness, and output size before returning results. Provider calls have a timeout. SQL connections close after their transaction scope.

## Keep ranking explainable

Responses include matched terms and local ranking scores. These scores are not probabilities. An empty overlap returns no result rather than a fabricated definition. The interface states that the catalog contains 40 entries, making the demo's coverage understandable.

## Test providers without spending credits

HTTP/SQLite tests exercise the local application. Mocked provider responses cover reranking, malformed output, fabricated IDs, duplicates, quota errors, and timeouts. A separate live-provider check is required to verify credentials, current model availability, and result quality.
