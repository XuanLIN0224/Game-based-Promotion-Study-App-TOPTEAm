// @vitest-environment jsdom
import React from "react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// 1) mock 路由（保持不变）
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children }) => children ?? null,
}));

// 2) —— 关键修复：用 vi.hoisted 提前声明可被 hoist 的 mocks ——
//    这样 Vitest 提升 vi.mock 时，这些变量已可用
const { mockGet, mockPatch, apiMock } = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockPatch = vi.fn();

  const apiMock = vi.fn((arg1, arg2) => {
    if (typeof arg1 === "string") {
      const path = arg1;
      const opts = arg2 || {};
      if (path === "/auth/me") {
        return Promise.resolve({ username: "aabbcc", email: "aabbcc@gmail.com" });
      }
      if (path === "/setting/me" && opts?.method === "PATCH") {
        mockPatch(path, opts.body ?? opts.data ?? {});
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({});
    }
    return {
      get: (path) => {
        mockGet(path);
        if (path === "/auth/me") {
          return Promise.resolve({ username: "aabbcc", email: "aabbcc@gmail.com" });
          // 如果组件写的是 res.data，
          // return Promise.resolve({ data: { username: "aabbcc", email: "aabbcc@gmail.com" } });
        }
        return Promise.resolve({});
      },
      patch: (path, body) => {
        mockPatch(path, body);
        if (path === "/setting/me") return Promise.resolve({ ok: true });
        return Promise.resolve({ ok: false });
      },
    };
  });

  return { mockGet, mockPatch, apiMock };
});

// 3) 使用 hoisted 出来的 apiMock 来 mock 模块
vi.mock("../api/client", () => ({
  api: apiMock,
  clearToken: vi.fn(),
}));

// --- 再导入其余依赖（此时上面的模块已被 mock）---
import { render, screen, within, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockReset();
  mockPatch.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("Settings", () => {
  it("successfully updates username", async () => {
    const { default: Settings } = await import("./Settings");

    render(<Settings />);

    const nameRow = await screen.findByText(/User Name:/i);

    const rowDiv = nameRow.closest("div");
    if (!rowDiv) throw new Error("Could not find row container for username");

    const editBtn = within(rowDiv).getByRole("button", { name: /Edit/i });
    await userEvent.click(editBtn);

    const input = await screen.findByLabelText(/User Name:/i);
    await userEvent.clear(input);
    await userEvent.type(input, "aabbccdd");

    await userEvent.click(screen.getByRole("button", { name: /Save/i }));

    expect(mockPatch).toHaveBeenCalledWith("/setting/me", { username: "aabbccdd" });
    expect(await screen.findByText(/aabbccdd/i)).toBeInTheDocument();
  });

  /* 
  it("successfully updates user email", () => {
    render(<Settings />);
    expect(screen.getByText(/User email/i)).toBeInTheDocument();
  });

  it("successfully updates password", () => {
    render(<Settings />);
    expect(screen.getByText(/password/i)).toBeInTheDocument();
  });

  it("log out successfully", () => {
    render(<Settings />);
    expect(screen.getByText(/Log out/i)).toBeInTheDocument();
  });
  */
});
