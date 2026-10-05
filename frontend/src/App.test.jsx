import React from "react";
import { it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App.jsx";
afterEach(() => vi.unstubAllGlobals());
it("renders candidate definitions after search", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({
        mode: "local",
        notice: "Local retrieval",
        suggestions: [
          {
            id: 1,
            word: "serendipity",
            definition: "A fortunate discovery",
            matched_terms: ["discovery"],
          },
        ],
      }),
    })),
  );
  render(<App />);
  fireEvent.change(screen.getByLabelText("Search mode"), {target:{value:"local"}});
  fireEvent.change(screen.getByLabelText("What are you trying to express?"), {
    target: { value: "fortunate discovery" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Find the word →" }));
  expect(await screen.findByText("serendipity")).toBeInTheDocument();
});
it("shows provider failure without pretending local mode succeeded", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: false,
      json: async () => ({ detail: "OpenAI is not configured" }),
    })),
  );
  render(<App />);
  fireEvent.change(screen.getByLabelText("What are you trying to express?"), {
    target: { value: "fortunate discovery" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Find the word →" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "OpenAI is not configured",
  );
});
it("disables empty queries and fills example descriptions", () => {
  render(<App />);
  expect(
    screen.getByRole("button", { name: "Find the word →" }),
  ).toBeDisabled();
  fireEvent.click(
    screen.getByRole("button", {
      name: "the ability to recover after difficulty",
    }),
  );
  expect(screen.getByLabelText("What are you trying to express?")).toHaveValue(
    "the ability to recover after difficulty",
  );
});
it("searches beyond the catalog in AI mode and labels model suggestions", async () => {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({mode:"openai", notice:"AI word search", suggestions:[{id:"ai-1", word:"aunt", definition:"The sister of a parent.", source:"openai", matched_terms:[]}]}),
  }));
  vi.stubGlobal("fetch", fetchMock);
  render(<App />);
  fireEvent.change(screen.getByLabelText("Search mode"), {target:{value:"openai"}});
  fireEvent.change(screen.getByLabelText("What are you trying to express?"), {target:{value:"The sister of my mother"}});
  fireEvent.click(screen.getByRole("button",{name:"Find the word →"}));
  expect(await screen.findByText("aunt")).toBeInTheDocument();
  expect(screen.getByText("Suggested by AI")).toBeInTheDocument();
  expect(screen.queryByText(/Matched terms:/)).not.toBeInTheDocument();
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).mode).toBe("openai");
});

it("defaults to AI and transparently falls back after a provider failure", async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({ok:false,status:502,json:async()=>({detail:"Provider timed out"})})
    .mockResolvedValueOnce({ok:true,status:200,json:async()=>({mode:"local",notice:"Local retrieval",suggestions:[{id:1,word:"serendipity",definition:"A fortunate discovery",matched_terms:["discovery"]}]})});
  vi.stubGlobal("fetch",fetchMock);render(<App />);
  expect(screen.getByLabelText("Search mode")).toHaveValue("openai");
  fireEvent.change(screen.getByLabelText("What are you trying to express?"),{target:{value:"fortunate discovery"}});
  fireEvent.click(screen.getByRole("button",{name:"Find the word →"}));
  expect(await screen.findByText("serendipity")).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("AI search is unavailable. Showing local catalog results.");
  expect(screen.getByText("LOCAL CATALOG")).toBeInTheDocument();
  expect(screen.queryByText("AI SUGGESTIONS")).not.toBeInTheDocument();
  expect(fetchMock.mock.calls.map(call=>JSON.parse(call[1].body).mode)).toEqual(["openai","local"]);
});
it("does not retry invalid descriptions through local search", async () => {
  const fetchMock=vi.fn(async()=>({ok:false,status:422,json:async()=>({detail:"Invalid description"})}));
  vi.stubGlobal("fetch",fetchMock);render(<App />);
  fireEvent.change(screen.getByLabelText("What are you trying to express?"),{target:{value:"some description"}});
  fireEvent.click(screen.getByRole("button",{name:"Find the word →"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("Invalid description");
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
