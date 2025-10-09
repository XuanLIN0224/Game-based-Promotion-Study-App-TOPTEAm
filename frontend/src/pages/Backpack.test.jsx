import React from "react";
import { it, expect, describe, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event"; // use to simulate events (e.g. click)
import Backpack from "./Backpack.jsx";

// mock router
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

// mock css
vi.mock("./Backpack.module.css", () => ({ default: {} }), { virtual: true });

let inventoryState;
beforeEach(() => {
  // assume there is a 'quiz_booster_today' in the backpack
  inventoryState = [{ key: "quiz_booster_today", qty: 1 }];
});

// Mock the "../api/client" module so the real API won't be called
vi.mock("../api/client", () => {
  // Create a mock "api" function to replace the real one
  const api = vi.fn(async (path, opts = {}) => {
    // When "/inventory" is called, 
    // return the current inventory list
    if (path === "/inventory") 
      return JSON.parse(JSON.stringify(inventoryState));

    // When "/auth/me" is called
    // return an empty object
    if (path === "/auth/me") 
      return {}; // ignore Pet Food for this simple test

    // Try to use an item
    if (path === "/inventory/use" && opts.method === "POST") {
      const { key, qty = 1 } = opts.body ?? {};
      // Find that item in our fake inventory
      const item = inventoryState.find((i) => i.key === key);
      // If it exists, reduce its quantity by the amount used
      if (item) item.qty = Math.max(0, item.qty - qty);

      return { ok: true };
    }

    // For any other endpoints, just return an empty object
    return {};
  });

  // Return the mock implementation to Vitest
  return { api };
});


describe("Quiz Booster for today", () => {
  it("uses item successfully", async () => {
    //expect(useItem().toBe());
    render(<Backpack />);

    await screen.findByText("Quiz Booster for today");

    const user = userEvent.setup();
    const useItemButton = await screen.findByTestId("use-item-button");

    await user.click(useItemButton);
    expect(useItemButton).toBeDisabled();
    expect(useItemButton).toHaveTextContent(/Using…/i);

    // update quantity for item
    await waitFor(() => {
      const itemRow = screen.getByText("Quiz Booster for today").closest("li");
      expect(itemRow.textContent).toMatch(/Qty:\s*0/i);
    });
  });
});  

