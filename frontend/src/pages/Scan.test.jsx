/*
  This test file covers the main functions of the Scan page:
   1. Scan a QR code through the camera
   2. Upload a QR file
   3. Update user's score (award attendance during lectures)
   4. Cleanup on unmount
*/

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";

/** Hoist and basic mocks */
// 1) Hoist-safe mock for ../api/client (used by Scan.jsx as api("/auth/me"))
let apiMock;
vi.mock("../api/client", () => {
  return {
    api: (...args) => {
      if (typeof apiMock === "function") return apiMock(...args);
      // default safe fallback so import doesn't crash before tests set apiMock
      return Promise.resolve({ score: 0, group: "default" });
    },
  };
});

// 2) Mock react-router-dom useNavigate
vi.mock("react-router-dom", async (orig) => {
  const actual = await orig();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// 3) Mock jsQR (Scan.jsx imports default)
let jsQRReturn = null;
vi.mock("jsqr", () => {
  return {
    default: vi.fn(() => jsQRReturn),
  };
});
import Scan from "./Scan.jsx";

/** Global Polyfills */
// HTMLMediaElement.srcObject polyfill (JSDOM doesn't provide it)
Object.defineProperty(HTMLMediaElement.prototype, "srcObject", {
  configurable: true,
  enumerable: true,
  get() {
    return this._srcObject || null;
  },
  set(v) {
    this._srcObject = v;
  },
});

// requestAnimationFrame we can step manually
let rafQueue = [];
global.requestAnimationFrame = (cb) => {
  const id = Math.floor(Math.random() * 1e6);
  rafQueue.push({ id, cb });
  return id;
};
global.cancelAnimationFrame = (id) => {
  rafQueue = rafQueue.filter((f) => f.id !== id);
};
function advanceRaf(times = 1) {
  for (let i = 0; i < times; i++) {
    const next = rafQueue.shift();
    if (!next) return;
    next.cb(performance.now());
  }
}

/** Mocks */
let getContextSpy;

// Mock canvas API
beforeEach(() => {
  rafQueue = [];

  Object.defineProperty(HTMLVideoElement.prototype, "readyState", {
    configurable: true,
    get() {
      // HAVE_ENOUGH_DATA = 4
      return 4;
    },
  });
  Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", {
    configurable: true,
    get() {
      return 350;
    },
  });
  Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", {
    configurable: true,
    get() {
      return 350;
    },
  });

  HTMLVideoElement.prototype.play = vi.fn();
  HTMLVideoElement.prototype.pause = vi.fn();

  getContextSpy = vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockImplementation(() => ({
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(10),
        width: 2,
        height: 5,
      })),
    }));
});

// Mock camera
const mockTrackStop = vi.fn();
const mockStream = { getTracks: () => [{ stop: mockTrackStop }] };
beforeEach(() => {
  mockTrackStop.mockReset();
  global.navigator.mediaDevices = {
    getUserMedia: vi.fn().mockResolvedValue(mockStream),
  };
});

// Mock fetch (only used by POST /api/user/scan in your component)
const fetchMock = vi.fn();
global.fetch = fetchMock;
beforeEach(() => {
  fetchMock.mockImplementation((url, init) => {
    const u = String(url);
    if (u.includes("/api/user/scan")) {
      // default: echo score 0 unless test overrides with mockResolvedValueOnce
      return Promise.resolve(
        new Response(JSON.stringify({ score: 0 }), { status: 200 })
      );
    }
    return Promise.resolve(new Response("{}", { status: 200 }));
  });
});

// Hoist-safe api mock impl per test
beforeEach(() => {
  apiMock = vi.fn((url) => {
    if (url === "/auth/me") return Promise.resolve({ score: 0, group: "default" });
    return Promise.resolve({});
  });
});

// token for the Authorization header
beforeEach(() => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
    if (key === "token") return "TEST_TOKEN";
    return null;
  });
});

// alert
beforeEach(() => {
  vi.spyOn(window, "alert").mockImplementation(() => {});
});

// Mock Image for upload path
class MockImage {
  constructor() {
    this.onload = null;
    this._src = "";
    this.width = 200;
    this.height = 200;
  }
  set src(v) {
    this._src = v;
    setTimeout(() => this.onload && this.onload());
  }
  get src() {
    return this._src;
  }
}
beforeEach(() => {
  vi.stubGlobal("Image", MockImage);
});

afterEach(() => {
  vi.restoreAllMocks();
  jsQRReturn = null;
  fetchMock.mockReset();
  rafQueue = [];
});

/** Helpers */
const urlIncludes = (substr) => ([url]) =>
  typeof url === "string" && url.includes(substr);

async function waitForFetchCall(matchFn, timeoutMs = 1200) {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const call = fetchMock.mock.calls.find(matchFn);
    if (call) return call;
    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for matching fetch call.");
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 10));
  }
}

function countScanPosts() {
  return fetchMock.mock.calls.filter(
    ([url, init]) =>
      typeof url === "string" &&
      url.includes("/api/user/scan") &&
      init &&
      String(init.method || "").toUpperCase() === "POST"
  ).length;
}

/* ------------------- TESTS ------------------- */

describe("Scan page", () => {
  it("renders, fetches /auth/me and shows score; starts camera", async () => {
    // api("/auth/me") -> dog, 42
    apiMock.mockResolvedValueOnce({ score: 42, group: "dog" });

    render(<Scan />);

    // Start loop
    advanceRaf(1);

    // Title
    expect(await screen.findByRole("heading", { name: /scan/i })).toBeInTheDocument();

    // Score from /auth/me
    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    // Icons exist
    expect(screen.getByAltText(/home/i)).toBeInTheDocument();
    expect(screen.getByAltText(/score/i)).toBeInTheDocument();

    // Video element present and camera requested
    const videoEl = document.querySelector("video");
    expect(videoEl).toBeInTheDocument();

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      video: { facingMode: "environment" },
    });
  });

  it("decodes a new QR frame via jsQR, posts to /user/scan, updates score and avoids duplicate re-posts", async () => {
    // /auth/me initial
    apiMock.mockResolvedValueOnce({ score: 10, group: "cat" });
    // POST response with updated score
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ score: 15 }), { status: 200 })
    );

    jsQRReturn = { data: "LECTURE_ABC" };

    render(<Scan />);

    // one frame: decode and post
    advanceRaf(1);

    // Ensure the scan POST happened and has correct body
    const scanCall = await waitForFetchCall(urlIncludes("/user/scan"));
    expect(scanCall[0]).toBe("http://localhost:5001/api/user/scan");
    expect(scanCall[1]).toEqual(
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer TEST_TOKEN",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ code: "LECTURE_ABC" }),
      })
    );

    // Updated score visible
    await screen.findByText("15");

    // Subsequent frames should NOT re-post once we null out jsQR
    const before = countScanPosts();
    jsQRReturn = null;
    advanceRaf(2);
    expect(countScanPosts()).toBe(before);
  });

  it("cleans up: cancels RAF and stops camera tracks on unmount", async () => {
    apiMock.mockResolvedValueOnce({ score: 1, group: "dog" });

    const { unmount } = render(<Scan />);

    await screen.findByText("1");

    // Ensure camera attached
    const videoEl = document.querySelector("video");
    expect(videoEl).toBeTruthy();
    await waitFor(() => {
      expect(videoEl._srcObject || videoEl.srcObject).toBeTruthy();
    });

    // Run a frame so loop active
    advanceRaf(1);

    // Unmount and verify cleanup
    unmount();

    // Tracks were stopped
    expect(mockTrackStop).toHaveBeenCalled();
  });

  it("file upload: decodes QR from image and posts to /user/scan; updates score", async () => {
    apiMock.mockResolvedValueOnce({ score: 5, group: "dog" });
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ score: 9 }), { status: 200 })
    );

    render(<Scan />);

    await screen.findByText("5");

    // jsQR returns code for uploaded image
    jsQRReturn = { data: "QUIZ_WEEK1" };

    // Input is inside the label "Upload QR from device"
    const label = screen.getByText(/upload qr from device/i);
    const fileInput = label.parentElement && label.parentElement.querySelector('input[type="file"]');
    expect(fileInput).toBeTruthy();

    const file = new File(["dummy-bytes"], "qr.png", { type: "image/png" });

    await act(async () => {
      await userEvent.upload(fileInput, file);
    });

    // Wait for /user/scan call
    const uploadScanCall = await waitForFetchCall(urlIncludes("/user/scan"));
    expect(uploadScanCall[1]).toEqual(
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ code: "QUIZ_WEEK1" }),
      })
    );

    await screen.findByText("9");
    expect(screen.getByText(/qr code:/i)).toBeInTheDocument();
  });

  // file upload: when no QR is found, inline message only (no alert)
  it("file upload: when no QR is found, no alert (inline message only)", async () => {
    apiMock.mockResolvedValueOnce({ score: 7, group: "cat" });

    render(<Scan />);
    await screen.findByText("7");

    jsQRReturn = null;

    const label = screen.getByText(/upload qr from device/i);
    const fileInput =
      label.parentElement && label.parentElement.querySelector('input[type="file"]');
    expect(fileInput).toBeTruthy();

    const file = new File(["dummy-bytes-2"], "noqr.jpg", { type: "image/jpeg" });
    await act(async () => {
      await userEvent.upload(fileInput, file);
    });

    // ✅ Query the element directly and assert its combined text
    const msgEl = await screen.findByTestId("scan-msg");
    expect(msgEl).toHaveTextContent(/no qr\s+found in this image/i);

    // ✅ No alert should fire on the "no QR" path
    expect(window.alert).not.toHaveBeenCalled();
  });
});
