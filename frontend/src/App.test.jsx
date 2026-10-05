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
