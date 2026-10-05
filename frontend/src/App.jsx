import { useState } from "react";
const examples = [
  "an unexpected fortunate discovery by chance",
  "someone who stays calm under pressure",
  "the ability to recover after difficulty",
  "The sister of my mother",
];
export default function App() {
  const [description, setDescription] = useState(""),
    [mode, setMode] = useState("openai"),
    [result, setResult] = useState(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [fallback, setFallback] = useState("");
  async function requestSearch(searchMode) {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, mode: searchMode, limit: 5 }),
    });
    const data = await response.json();
    if (!response.ok) {
      const failure = new Error(typeof data.detail === "string" ? data.detail : "Please enter a valid description.");
      failure.status = response.status;
      throw failure;
    }
    return data;
  }
  async function search(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setFallback("");
    setResult(null);
    try {
      let data;
      try {
        data = await requestSearch(mode);
      } catch (aiError) {
        if (mode !== "openai" || (aiError.status && aiError.status < 500 && ![401,403,429].includes(aiError.status))) throw aiError;
        try {
          data = await requestSearch("local");
          setFallback(`AI search is unavailable. Showing local catalog results. ${aiError.message}`);
        } catch {
          throw new Error(`AI search failed and local search is unavailable. ${aiError.message}`);
        }
      }
      setResult(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <main>
      <header>
        <span className="eyebrow">PYTHON · FASTAPI · REACT</span>
        <h1>The meaning comes first.</h1>
        <p>Know the idea, but not the word? Describe it.</p>
      </header>
      <section className="search">
        <form onSubmit={search}>
          <label htmlFor="description">What are you trying to express?</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            minLength={3}
            maxLength={300}
            required
            placeholder="A lucky discovery you were not looking for…"
          />
          <div className="controls">
            <label>
              Search mode
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="local">Local catalog</option>
                <option value="openai">AI word search</option>
              </select>
            </label>
            <button
              disabled={loading || description.trim().length < 3}
              type="submit"
            >
              {loading ? "Finding words…" : "Find the word →"}
            </button>
          </div>
        </form>
        <div className="examples">
          <span>Try a description</span>
          {examples.map((text) => (
            <button key={text} onClick={() => setDescription(text)}>
              {text}
            </button>
          ))}
        </div>
      </section>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {loading && <p role="status">Searching…</p>}
      {fallback && <p role="status" className="notice">{fallback}</p>}
      {result && (
        <section className="results">
          <div className="result-heading">
            <h2>
              {result.suggestions.length
                ? "Words to explore"
                : "No close match yet"}
            </h2>
            <span>
              {result.mode === "local" ? "LOCAL CATALOG" : "AI SUGGESTIONS"}
            </span>
          </div>
          <p className="notice">{result.notice}</p>
          {!result.suggestions.length && (
            <p>{result.mode === "local" ? "The small catalog has no matching terms. Try AI word search." : "No established term was suggested. Try rephrasing your description."}</p>
          )}
          {result.suggestions.map((s, i) => (
            <article key={s.id}>
              <div className="rank">{String(i + 1).padStart(2, "0")}</div>
              <div>
                <h3>{s.word}</h3>
                <p>{s.definition}</p>
                <small>{s.source === "openai" ? "Suggested by AI" : `Matched terms: ${s.matched_terms.join(", ")}`}</small>
              </div>
            </article>
          ))}
        </section>
      )}
      <footer>
        Local search: 40 curated words. AI word search goes beyond the catalog.
        <br />
        AI mode sends descriptions to OpenAI. The application does not save searches.
      </footer>
    </main>
  );
}
