/*
  This test file covers the main functions of the Rank page:
   1. Fetch the top 20 percent of users in the system
   2. Render leaders with correct numbering and images (of the corresponding user's breed's group and name)
   3. Navigate back to the Home page by clicking the Home icon
   4. Empty/error branches: no list rendered
*/

// @vitest-environment jsdom
import React from "react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

/** Define our Mock */
// Mock router navigation
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children }) => children ?? null,
}));

// Hoisted api client mock
// Our own testing/mocking test components
const { apiMock, mockCalls, breedsSample, ranksSample, clearApiMock } = vi.hoisted(() => {
  // Sample responses--we use these to test our main functions so we no longer need to actually reach our backend
  // For breed test: breedId in ranksSample->breadObject--which has name and group, then we use these infos to find the correct corresponding image
  const breedsSample = [
    { _id: "b1", name: "Border Collie", group: "dog" },
    { _id: "b2", name: "Ragdoll", group: "cat" },
  ];
  // For rank test: 1. Get the top 20% of the users; 2. Use the breedsSample to find the correct image
  const ranksSample = [
    { _id: "u1", username: "Max",  score: 100, breed: "b1" },
    { _id: "u2", username: "Momo", score:  80, breed: { name: "Ragdoll", group: "cat" } },
    { _id: "u3", username: "Rex",  score:  75, breed: "unknown" },
  ];

  // Collect calls for future assertions
  const mockCalls = [];

  // Mock the real function-style apis--replace it with our fixture
  // The method here is determined by our 'api()' function in client.js, which is function-styled
  const apiMock = vi.fn((path, opts) => {
    mockCalls.push([path, opts]);
    if (path === "/rank/top")  return Promise.resolve(ranksSample);
    if (path === "/breeds")    return Promise.resolve(breedsSample);
    return Promise.resolve([]);
  });

  // Clear the pollution of the previous test, before any new run of this test
  const clearApiMock = () => {
    mockCalls.length = 0;
    apiMock.mockClear && apiMock.mockClear();
  };

  return { apiMock, mockCalls, breedsSample, ranksSample, clearApiMock };
});

/** Wire the API client name your component imports */
vi.mock("../api/client", () => ({
  api: (path, opts) => apiMock(path, opts),
}));

// Testing Library utils
import { render, screen, within, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

/** Reset between tests */
// Clean the data from the last testing run before the new test
beforeEach(() => {
  vi.clearAllMocks();
  clearApiMock();
});

// Clean the data of the just-finished test after running a test
afterEach(() => {
  cleanup();
});

/** Assert calls and expected (rendered) outputs */
describe("Rank (Leaderboard)", () => {
  /** Case 1, 2, and 3: Get the leader list, find the corresponding image, and render it on the UI, and navigating back to the Home page */
  it("loads rank + breeds and renders rows with correct images & numbering; home icon navigates", async () => {
    const { default: Rank } = await import("./Rank");
    const { container } = render(<Rank />);

    // Wait for the list to appear (renders only when !loading && !err && rows.length>0)
    const list = await screen.findByRole("list");
    const items = within(list).getAllByRole("listitem");
    expect(items.length).toBe(3);

    // Assert api calls
    const paths = mockCalls.map(([p]) => p);
    expect(paths).toContain("/rank/top");
    expect(paths).toContain("/breeds");

    // Row 1: "1. Max - 100" + Border Collie dog image
    expect(items[0]).toHaveTextContent(/^1\.\s*Max\s*-\s*100$/);
    const img1 = within(items[0]).getByRole("img");
    expect(img1.getAttribute("src")).toMatch(/\/icons\/home\/BorderCollie\.gif$/);
    expect(img1).toHaveAttribute("alt", expect.stringMatching(/Border Collie|dog|pet/i));

    // Row 2: "2. Momo - 80" + Ragdoll cat image
    expect(items[1]).toHaveTextContent(/^2\.\s*Momo\s*-\s*80$/);
    const img2 = within(items[1]).getByRole("img");
    expect(img2.getAttribute("src")).toMatch(/\/icons\/home\/ragdoll_cat\.gif$/i);
    expect(img2).toHaveAttribute("alt", expect.stringMatching(/Ragdoll|cat|pet/i));

    // Row 3: "3. Rex - 75" + default main.gif (unknown breed)
    expect(items[2]).toHaveTextContent(/^3\.\s*Rex\s*-\s*75$/);
    const img3 = within(items[2]).getByRole("img");
    expect(img3.getAttribute("src")).toMatch(/\/icons\/home\/main\.gif$/);

    // Clicking the Home icon navigates to "/"
    const homeImg = container.querySelector('img[alt="Home"]');
    expect(homeImg).toBeTruthy();
    if (homeImg) {
      await userEvent.click(homeImg);
    }
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  /** Case 4.1: No users in the database yet, no leaders, the returning list is empty */
  it("when /rank/top returns empty, no list is rendered", async () => {
    // override api mock to return empty ranks
    apiMock.mockImplementation((path) => {
      if (path === "/rank/top")  return Promise.resolve([]);
      if (path === "/breeds")    return Promise.resolve(breedsSample);
      return Promise.resolve([]);
    });

    const { default: Rank } = await import("./Rank");
    render(<Rank />);

    // Allow effect to settle
    await waitFor(() => {});
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
  /** Case 4.2: API calling error, returning null */
  it("when an API call throws (error), no list is rendered", async () => {
    apiMock.mockImplementation((path) => {
      if (path === "/rank/top")  return Promise.reject(new Error("HTTP 500 (/rank/top)"));
      if (path === "/breeds")    return Promise.resolve(breedsSample);
      return Promise.resolve([]);
    });

    const { default: Rank } = await import("./Rank");
    render(<Rank />);

    // Allow effect to settle
    await waitFor(() => {});
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
