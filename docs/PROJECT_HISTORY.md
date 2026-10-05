# Recovered project history

The iCloud archive contained an earlier reverse-dictionary prototype: Flask routes and two legacy OpenAI completion calls to generate a candidate word and synonyms. It also contained Spring Boot starter code and a separate HTML template.

The recovered files were not a complete runnable full-stack application. The Flask renderer expected templates in a different location; the HTML form posted to a route absent from the Flask code, used different response variables, and linked styling inconsistently. The Spring security class contained invalid lambda code, and no Java dictionary controller or persistence layer was present.

The current public project is a modern rebuild: FastAPI, React, SQLite catalog retrieval, optional OpenAI reranking, input/output validation, and automated tests. Its retrieval method and verification limits are documented in the README. It is not evidence that FastAPI, React, embeddings, or a Java backend were already implemented in the older prototype.

Recovered source details are recorded for provenance; publication of this rebuild is dated October 2026. No course dates, certificate, deployment history, or performance metrics are inferred from the archive.
