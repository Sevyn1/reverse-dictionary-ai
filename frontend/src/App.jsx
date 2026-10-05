import { useState } from "react";
const examples = [
  "an unexpected fortunate discovery by chance",
  "someone who stays calm under pressure",
  "the ability to recover after difficulty",
];
export default function App() {
  const [description, setDescription] = useState(""),
    [mode, setMode] = useState("local"),
    [result, setResult] = useState(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  async function search(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const r = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, mode, limit: 5 }),
      });
      const data = await r.json();
      if (!r.ok)
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Please enter a valid description.",
        );
      setResult(data);
    } catch (e) {
      setError(e.message);
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
                <option value="openai">OpenAI reranking</option>
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
      {result && (
        <section className="results">
          <div className="result-heading">
            <h2>
              {result.suggestions.length
                ? "Words to explore"
                : "No close match yet"}
            </h2>
            <span>
              {result.mode === "local" ? "LOCAL CATALOG" : "OPENAI RERANKED"}
            </span>
          </div>
          <p className="notice">{result.notice}</p>
          {!result.suggestions.length && (
            <p>The small catalog has no matching terms. Try simpler wording.</p>
          )}
          {result.suggestions.map((s, i) => (
            <article key={s.id}>
              <div className="rank">{String(i + 1).padStart(2, "0")}</div>
              <div>
                <h3>{s.word}</h3>
                <p>{s.definition}</p>
                <small>Matched terms: {s.matched_terms.join(", ")}</small>
              </div>
            </article>
          ))}
        </section>
      )}
      <footer>
        Portfolio demo · 40 curated words · local search works without an API
        key.
        <br />
        OpenAI mode requires server configuration. No query history is stored by
        the application.
      </footer>
    </main>
  );
}
