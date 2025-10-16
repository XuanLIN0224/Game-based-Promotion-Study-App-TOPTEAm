// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// --- Mock router navigation ---
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children }) => children ?? null,
}));

// --- Mock CSS module (returns class names as strings) ---
vi.mock("./Shop.module.css", () => {
  const proxy = new Proxy({}, { get: (_t, p) => String(p) });
  return { default: proxy };
});

// --- Mock API module and server state ---
const { apiMock, resetServerState } = vi.hoisted(() => {
  // initial in-memory catalog
  const initialCatalog = [
    { key: "extra_attempt", price: 20, weeklyLimit: 2, used: 0, remaining: 2 },
    { key: "lollies_voucher", price: 5, weeklyLimit: 1, used: 1, remaining: 0 },
    { key: "quiz_booster_today", price: 30, weeklyLimit: 1, used: 0, remaining: 1 },
    { key: "pet_food", price: 1, weeklyLimit: 20, used: 0, remaining: 20 },
    { key: "lecture_qr", price: 10, weeklyLimit: 1, used: 1, remaining: 0 },
  ];

  // server-side user and catalog
  let catalog;
  let user;

  // resets server state before each test
  function resetServerState() {
    catalog = initialCatalog.map(i => ({ ...i }));
    user = { score: 50 }; // starting balance
  }
  resetServerState();

  // main API mock function
  const apiMock = vi.fn((arg1, arg2) => {
    if (typeof arg1 === "string") {
      const path = arg1;
      const opts = arg2 || {};
      const method = (opts.method || "GET").toUpperCase();

      // GET /shop/catalog → returns catalog list
      if (path === "/shop/catalog" && method === "GET") {
        return Promise.resolve(catalog.map(i => ({ ...i })));
      }

      // GET /auth/me → returns user info
      if (path === "/auth/me" && method === "GET") {
        return Promise.resolve({ score: user.score });
      }

      // POST /shop/purchase → simulates buying an item
      if (path === "/shop/purchase" && method === "POST") {
        const body = opts.body || opts.data || {};
        const { itemKey, qty } = body;
        const q = Number(qty) || 1;
        const item = catalog.find(i => i.key === itemKey);
        if (!item) return Promise.reject(new Error("Item not found"));

        const total = (item.price || 0) * q;

        if (item.remaining <= 0)
          return Promise.reject(new Error("Weekly limit reached"));
        if (total > user.score)
          return Promise.reject(new Error("Insufficient balance"));

        // apply the purchase
        const consume = Math.min(q, item.remaining);
        item.remaining -= consume;
        item.used = Math.min(
          (item.used || 0) + consume,
          item.weeklyLimit || item.used + consume
        );
        user.score -= (item.price || 0) * consume;

        return Promise.resolve({
          remaining: item.remaining,
          user: { score: user.score },
        });
      }

      return Promise.resolve({});
    }

    // fallback (axios-like style)
    return {
      get: (p) => apiMock(p),
      post: (p, data) => apiMock(p, { method: "POST", body: data }),
    };
  });

  return { apiMock, resetServerState };
});

// --- Mock the real client API import ---
vi.mock("../api/client", () => ({ api: apiMock }));

// --- Import the component under test ---
import Shop from "./Shop.jsx";

// --- Helper function: render and wait until data loaded ---
async function renderAndLoad() {
  render(<Shop />);
  // Wait until the balance and one item title are visible
  await screen.findByText(/Balance \(Score\):/i);
  await screen.findByText("Extra Quiz Attempt");
}

// --- TEST SUITE ---
describe("Shop page (happy path & basic disabled cases)", () => {
  beforeEach(() => {
    resetServerState();
    vi.clearAllMocks();
  });

  // Test 1: initial load
  it("loads catalog and shows balance", async () => {
    await renderAndLoad();

    // Check item titles appear in catalog
    expect(screen.getByText("Extra Quiz Attempt")).toBeInTheDocument();
    expect(screen.getByText("Lollies Voucher")).toBeInTheDocument();
    expect(screen.getByText("Quiz Booster (Today)")).toBeInTheDocument();
    expect(screen.getByText("Pet Food")).toBeInTheDocument();
    expect(screen.getByText("Lecture QR Code")).toBeInTheDocument();

    // Check balance displays 50 
    const balanceRow = screen.getByText(/Balance \(Score\):/i).parentElement;
    expect(balanceRow).toHaveTextContent(/Balance \(Score\):\s*50/i);
  });

  // Test 2: successful purchase
  it("buys one Extra Quiz Attempt (x1 by default), updates remaining and balance", async () => {
    await renderAndLoad();

    const row = screen.getByText("Extra Quiz Attempt").closest("li");
    const buyBtn = within(row).getByRole("button", { name: "Buy" });

    // Simulate clicking Buy button
    const user = userEvent.setup();
    await user.click(buyBtn);

    // Wait for success message instead of transient "Purchasing…" text
    const okMsg = await screen.findByText(/Purchased Extra Quiz Attempt x1/i);
    expect(okMsg.textContent).toMatch(/Remaining this week: 1/);

    // Verify balance updated: 30
    const balanceRowAfter = screen.getByText(/Balance \(Score\):/i).parentElement;
    expect(balanceRowAfter).toHaveTextContent(/Balance \(Score\):\s*30/i);

    // Verify updated "Remaining" count after catalog refetch
    await waitFor(() => {
      const info = within(row).getByText(/Remaining:/i).textContent;
      expect(info).toMatch(/Remaining:\s*1/);
    });
  });

  // Test 3: "Buy" disabled when remaining = 0
  it("disables Buy when remaining is 0", async () => {
    await renderAndLoad();

    const row = screen.getByText("Lollies Voucher").closest("li");
    const buyBtn = within(row).getByRole("button", { name: "Buy" });

    expect(buyBtn).toBeDisabled();

    expect(within(row).getByText(/Unable to buy/i)).toBeInTheDocument();
  });
});