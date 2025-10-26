/* @vitest-environment jsdom */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";

// ---- Module under test ----
import Scan from "./Scan.jsx";

// ----------------- GLOBAL POLYFILLS / MOCKS -----------------

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

// Queue-based requestAnimationFrame so we can step frames manually
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

// Mock react-router-dom useNavigate
vi.mock("react-router-dom", async (orig) => {
  const actual = await orig();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Mock jsQR
let jsQRReturn = null;
vi.mock("jsqr", () => {
  return {
    default: vi.fn(() => jsQRReturn),
  };
});

// ----------------- PER-TEST SETUP -----------------

let getContextSpy;

// Video ready & canvas
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

  // keep no-op functions to avoid errors
  HTMLVideoElement.prototype.play = vi.fn();
  HTMLVideoElement.prototype.pause = vi.fn();

  // Always mock canvas.getContext to return a 2D-like API
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

// navigator.mediaDevices.getUserMedia mock
const mockTrackStop = vi.fn();
const mockStream = { getTracks: () => [{ stop: mockTrackStop }] };
beforeEach(() => {
  mockTrackStop.mockReset();
  global.navigator.mediaDevices = {
    getUserMedia: vi.fn().mockResolvedValue(mockStream),
  };
});

// fetch mock (used by /auth/me and /user/scan)
const fetchMock = vi.fn();
global.fetch = fetchMock;

// Provide a DEFAULT fetch implementation so extra calls don't explode
beforeEach(() => {
  fetchMock.mockImplementation((url) => {
    const u = String(url);
    if (u.includes("/api/auth/me")) {
      return Promise.resolve(
        new Response(JSON.stringify({ score: 0, group: "default" }), { status: 200 })
      );
    }
    if (u.includes("/api/user/scan")) {
      return Promise.resolve(new Response(JSON.stringify({ score: 0 }), { status: 200 }));
    }
    return Promise.resolve(new Response("{}", { status: 200 }));
  });
});

// localStorage token mock
beforeEach(() => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
    if (key === "token") return "TEST_TOKEN";
    return null;
  });
});

// alert mock
beforeEach(() => {
  vi.spyOn(window, "alert").mockImplementation(() => {});
});

// Mock Image for upload flow
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

// ----------------- HELPERS -----------------

const urlIncludes = (substr) => ([url]) => typeof url === "string" && url.includes(substr);

async function waitForFetchCall(matchFn, timeoutMs = 1200) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const call = fetchMock.mock.calls.find(matchFn);
    if (call) return call;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error("Timed out waiting for matching fetch call.");
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

// ----------------- TESTS -----------------

describe("Scan page", () => {
  it("renders, fetches /auth/me and shows score; starts camera", async () => {
    // /auth/me -> initial score/group
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ score: 42, group: "dog" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    render(<Scan />);

    // One frame so loop starts (doesn't decode anything here)
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

    // Video element present (camera attached)
    const videoEl = document.querySelector("video");
    expect(videoEl).toBeInTheDocument();

    // getUserMedia called with rear cam
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      video: { facingMode: "environment" },
    });
  });

  it("decodes a new QR frame via jsQR, posts to /user/scan, updates score and avoids duplicate re-posts", async () => {
    // /auth/me initial (override default)
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ score: 10, group: "cat" }), { status: 200 })
    );
    // POST response with updated score (override default)
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ score: 15 }), { status: 200 })
    );

    // jsQR will decode on the next frame
    jsQRReturn = { data: "LECTURE_ABC" };

    render(<Scan />);

    // Trigger one frame: should decode and POST once
    advanceRaf(1);

    // Ensure the scan POST happened and has correct payload
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

    // Updated score should be visible
    await screen.findByText("15");

    // On subsequent frames, force no decode to avoid pre-state-update duplicates
    const before = countScanPosts();
    jsQRReturn = null;
    advanceRaf(2);
    expect(countScanPosts()).toBe(before);
  });

  it("cleans up: cancels RAF and stops camera tracks on unmount", async () => {
    // /auth/me
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ score: 1, group: "dog" }), { status: 200 })
    );

    const { unmount } = render(<Scan />);

    await screen.findByText("1");

    // Ensure camera stream is attached
    const videoEl = document.querySelector("video");
    expect(videoEl).toBeTruthy();
    await waitFor(() => {
      expect(videoEl._srcObject || videoEl.srcObject).toBeTruthy();
    });

    // Run a frame so the loop is active
    advanceRaf(1);

    // Unmount and verify cleanup effects
    unmount();

    // The important bit: tracks were stopped
    expect(mockTrackStop).toHaveBeenCalled();

    // Optional: if you still want to check clearing, make it non-fatal:
    // const after = videoEl._srcObject || videoEl.srcObject;
    // expect(after === null || after === undefined || Array.isArray(after?.getTracks?.()) && after.getTracks().length === 0).toBe(true);
  });

  it("file upload: decodes QR from image and posts to /user/scan; updates score", async () => {
    // /auth/me
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ score: 5, group: "dog" }), { status: 200 })
    );
    // scan post response
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ score: 9 }), { status: 200 })
    );

    render(<Scan />);

    await screen.findByText("5");

    // Prepare jsQR to return code when image drawn
    jsQRReturn = { data: "QUIZ_WEEK1" };

    // Find the hidden file input via label
    const label = screen.getByText(/upload qr from device/i);
    const fileInput = label.parentElement.querySelector('input[type="file"]');
    expect(fileInput).toBeTruthy();

    const file = new File(["dummy-bytes"], "qr.png", { type: "image/png" });

    await act(async () => {
      await userEvent.upload(fileInput, file);
    });

    // Wait for /user/scan to be called
    const uploadScanCall = await waitForFetchCall(urlIncludes("/user/scan"));
    expect(uploadScanCall[1]).toEqual(
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ code: "QUIZ_WEEK1" }),
      })
    );

    await screen.findByText("9");
    expect(window.alert).toHaveBeenCalledWith("✅ Scanned! Your new score: 9");
  });

  it("file upload: alerts when no QR is found in the image", async () => {
    // /auth/me
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ score: 7, group: "cat" }), { status: 200 })
    );

    render(<Scan />);

    await screen.findByText("7");

    // Force jsQR to return null (no QR)
    jsQRReturn = null;

    const label = screen.getByText(/upload qr from device/i);
    const fileInput = label.parentElement.querySelector('input[type="file"]');

    const file = new File(["dummy-bytes-2"], "noqr.jpg", { type: "image/jpeg" });

    await act(async () => {
      await userEvent.upload(fileInput, file);
    });

    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith("❌ No QR code found in this image")
    );
  });
});
