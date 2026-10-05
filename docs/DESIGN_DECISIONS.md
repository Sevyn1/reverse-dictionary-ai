# Design decisions

## AI word search and local retrieval serve different purposes

The original catalog-first design could not answer “The sister of my mother”: no local candidate matched, so no model request was made. AI mode now sends the meaning directly to the model and parses word/definition suggestions. It is not constrained to the catalog. Local mode retains deterministic keyword retrieval over 40 curated words. The original constrained reranking algorithm remains available as API mode `rerank` for comparison.

## Default to AI with transparent fallback

The interface starts in AI mode. If the AI request fails because of missing/rejected credentials, provider errors, rate limits, timeouts or connection problems, it tries local search. A visible notice explains the fallback and results are labeled local. The user's preferred AI selection remains selected, so the next search can try AI again. Explicit local mode does not call the provider. Validation errors are not repeated through fallback. A successful empty AI response is a no-match result, not a provider failure.

## Validate responses without claiming semantic certainty

The model returns JSON containing at most five word/definition objects. Pydantic enforces field names and lengths; word validation permits letters, spaces, apostrophes and hyphens, limits terms to four words, and rejects duplicates and excess results. This validates structure; it does not prove that every term exists or every definition is correct. UI labels identify generated suggestions. React renders returned fields as text. No generated lexical confidence score is invented.

The description is passed as data under a reverse-dictionary system instruction. This is a prompt boundary, not a proof of prompt-injection immunity. The model has no file, shell, database-write or browsing tools.

## Bound cost and retain actionable errors

Model requests time out after 15 seconds. Direct suggestions use at most 600 output tokens, while legacy reranking uses 150. Provider credential, permission, quota and rate-limit categories have separate safe messages; raw provider messages are not exposed. Credentials stay on the server. The app does not persist query history.

## Verification scope

36 backend and six interface tests cover both retrieval and model-output validation, words absent from the catalog, malformed suggestions, duplicates, result limits, provider failures, AI default selection, transparent fallback, and invalid-input handling. Provider tests use mocks. Live model checks are documented separately in VERIFICATION.md; a few examples do not establish broad language accuracy.
