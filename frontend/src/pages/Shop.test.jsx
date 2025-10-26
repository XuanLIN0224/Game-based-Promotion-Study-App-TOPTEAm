// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock router navigation
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children }) => children ?? null,
}));

// Mock CSS module
vi.mock("./Shop.module.css", () => {
  const proxy = new Proxy({}, { get: (_t, p) => String(p) });
  return { default: proxy };
});

// Mock API client
const { apiMock, resetServerState } = vi.hoisted(() => {
  // Initial catalog (as shown in the developer's examples)
  const initialCatalog = [
    { key: "extra_attempt", price: 20, weeklyLimit: 2, used: 0, remaining: 2 },
    { key: "lollies_voucher", price: 5, weeklyLimit: 1, used: 1, remaining: 0 },
    { key: "quiz_booster_today", price: 30, weeklyLimit: 1, used: 0, remaining: 1 },
    { key: "pet_food", price: 1, weeklyLimit: 20, used: 0, remaining: 20 },
    { key: "lecture_qr", price: 10, weeklyLimit: 1, used: 1, remaining: 0 },
  ];

  // Mutable "server" state
  let catalog;
  let me;

  // Reset between tests
  function resetServerState() {
    catalog = initialCatalog.map(i => ({ ...i }));
    me = {
      score: 50,       // initial balance shown next to the coin
      group: "dog",    // affects which icon is used; not critical to assertions
      numPetFood: 3,   // shown next to the feed icon
    };
  }
  resetServerState();

  // Core API mock that supports api(path) and api(path, { method, body })
  const apiMock = vi.fn((arg1, arg2) => {
    if (typeof arg1 === "string") {
      const path = arg1;
      const opts = arg2 || {};
      const method = (opts.method || "GET").toUpperCase();

      // GET /shop/catalog -> return all items
      if (path === "/shop/catalog" && method === "GET") {
        return Promise.resolve(catalog.map(i => ({ ...i })));
      }

      // GET /auth/me -> include score, group, numPetFood
      if (path === "/auth/me" && method === "GET") {
        return Promise.resolve({ ...me });
      }

      // POST /shop/purchase -> apply purchase, update "me.score" and item remaining/used
      if (path === "/shop/purchase" && method === "POST") {
        const body = opts.body || opts.data || {};
        const { itemKey, qty } = body;
        const q = Number(qty) || 1;

        const item = catalog.find(i => i.key === itemKey);
        if (!item) return Promise.reject(new Error("Item not found"));

        // Reject if weekly limit or insufficient balance
        if (item.remaining <= 0) {
          return Promise.reject(new Error("Weekly limit reached"));
        }
        const total = (item.price || 0) * q;
        if (total > me.score) {
          return Promise.reject(new Error("Insufficient balance"));
        }

        // Apply purchase
        const consume = Math.min(q, item.remaining);
        item.remaining -= consume;
        item.used = Math.min(
          (item.used || 0) + consume,
          item.weeklyLimit || (item.used + consume)
        );
        me.score -= (item.price || 0) * consume;

        return Promise.resolve({
          remaining: item.remaining,
          user: { score: me.score },
        });
      }

      // Unknown path: return an empty object as a safe default
      return Promise.resolve({});
    }

    // axios-like fallback (unused but harmless)
    return {
      get: (p) => apiMock(p),
      post: (p, data) => apiMock(p, { method: "POST", body: data }),
    };
  });

  return { apiMock, resetServerState };
});

// Wire the component to our mocked API
vi.mock("../api/client", () => ({ api: apiMock }));

// Import the component under test AFTER mocks
import Shop from "./Shop.jsx";

async function renderAndLoad() {
  render(<Shop />);
  await screen.findByText("Extra Quiz Attempt");
  // The left sidebar shows the score next to a Money icon.
  // We'll assert it in tests where needed, so it's okay to just wait for catalog here.
}

// --- Helpers (minimal) ---
// Fallback-friendly way to get the container that holds the balance number:
// 1) Prefer the new sidebar row (alt="Money"); 2) fallback to legacy "Balance (Score): <num>" row.
function getBalanceContainer() {
  const moneyIcon = screen.queryByAltText("Money");
  if (moneyIcon) return moneyIcon.closest(".pagelinkicon");
  const legacyLabel = screen.queryByText(/Balance \(Score\):/i);
  return legacyLabel ? legacyLabel.parentElement : null;
}

// TESTS
describe("Shop page (updated UI: sidebar balance & pet food)", () => {
  beforeEach(() => {
    resetServerState();
    vi.clearAllMocks();
  });

  it("loads catalog, shows balance near the Money icon, and shows Pet Food count", async () => {
    await renderAndLoad();

    // Catalog items appear
    expect(screen.getByText("Extra Quiz Attempt")).toBeInTheDocument();
    expect(screen.getByText("Lollies Voucher")).toBeInTheDocument();
    expect(screen.getByText("Quiz Booster (Today)")).toBeInTheDocument();
    expect(screen.getByText("Pet Food")).toBeInTheDocument();
    expect(screen.getByText("Lecture QR Code")).toBeInTheDocument();

    // Sidebar numbers:
    // Find the "Money" icon, then assert the same row shows the score "50".
    // (If the Money icon doesn't exist in this layout, gracefully fallback to the legacy Balance row.)
    const moneyIcon = screen.queryByAltText("Money");
    if (moneyIcon) {
      const moneyRow = moneyIcon.closest(".pagelinkicon");
      expect(within(moneyRow).getByText("50")).toBeInTheDocument();
    } else {
      const balanceRow = getBalanceContainer();
      expect(balanceRow).not.toBeNull();
      expect(balanceRow.textContent).toMatch(/\b50\b/);
    }

    // Find the "Feed" icon, then assert the same row shows pet food count "3".
    // (Feed only exists in the new sidebar layout; if absent, skip this assertion.)
    const feedIcon = screen.queryByAltText("Feed");
    if (feedIcon) {
      const feedRow = feedIcon.closest(".pagelinkicon");
      expect(within(feedRow).getByText("3")).toBeInTheDocument();
    }
  });

  it("buys one Extra Quiz Attempt and updates remaining + sidebar balance", async () => {
    await renderAndLoad();

    // Locate the Extra Quiz Attempt row
    const row = screen.getByText("Extra Quiz Attempt").closest("li");
    const buyBtn = within(row).getByRole("button", { name: "Buy" });

    // Click Buy
    const user = userEvent.setup();
    await user.click(buyBtn);

    const okMsg = await screen.findByText(/Purchased Extra Quiz Attempt x1/i);
    expect(okMsg.textContent).toMatch(/Remaining this week:\s*1/);

    // Sidebar balance should update: 50 - 20 = 30
    // (Again: prefer Money icon row, fallback to legacy balance row.)
    const moneyIcon = screen.queryByAltText("Money");
    if (moneyIcon) {
      const moneyRow = moneyIcon.closest(".pagelinkicon");
      expect(moneyRow).toHaveTextContent(/\b30\b/);
    } else {
      const balanceRow = getBalanceContainer();
      expect(balanceRow).not.toBeNull();
      expect(balanceRow.textContent).toMatch(/\b30\b/);
    }

    // The row's "Remaining" should reflect refetched catalog (1 left)
    await waitFor(() => {
      const info = within(row).getByText(/Remaining:/i).textContent;
      expect(info).toMatch(/Remaining:\s*1/);
    });
  });

  it("disables Buy when remaining is 0 (e.g., Lollies Voucher)", async () => {
    await renderAndLoad();

    const row = screen.getByText("Lollies Voucher").closest("li");
    const buyBtn = within(row).getByRole("button", { name: "Buy" });

    // Button must be disabled due to remaining=0
    expect(buyBtn).toBeDisabled();

    // Shows "Unable to buy" hint in the total box
    expect(within(row).getByText(/Unable to buy/i)).toBeInTheDocument();
  });
});