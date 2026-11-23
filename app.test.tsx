// @vitest-environment jsdom
import { cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadPluginApp, renderSlot } from "@get-bb/plugin-sdk/testing/app";
import { DEFAULT_PING_MESSAGE, resolvePingMessage } from "./lib/ping-message";

// sonner paints only through a mounted <Toaster>, which bb owns. Assert on the
// calls instead of on DOM nodes. vi.mock factories are hoisted, so the spies
// come from vi.hoisted.
const { success, error } = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success, error } }));

const app = await loadPluginApp(() => import("./app"));

function action() {
  const [customization] = app.composerCustomizations;
  const [entry] = customization?.actions ?? [];
  if (entry === undefined) throw new Error("Ping registered no composer action");
  return entry;
}

function renderComposer(options: {
  isRunning: boolean;
  send: (args: unknown) => Promise<unknown>;
  settings?: Record<string, string | number | boolean>;
  threadId?: string;
}) {
  return renderSlot(
    { component: action().component },
    {},
    {
      composer: {
        scope: { kind: "thread", threadId: options.threadId ?? "thr_42" },
        isRunning: options.isRunning,
      },
      settings: options.settings,
      sdk: { threads: { send: options.send as never } },
    },
  );
}

function pingButton(slot: { getByLabelText: (label: string) => HTMLElement }): HTMLButtonElement {
  return slot.getByLabelText("Ping") as HTMLButtonElement;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("composer customization", () => {
  it("registers one thread-scoped action", () => {
    expect(app.composerCustomizations).toHaveLength(1);
    const [customization] = app.composerCustomizations;
    expect(customization!.id).toBe("ping");
    expect(customization!.scopes).toEqual(["thread"]);
    expect(customization!.actions).toHaveLength(1);
    expect(customization!.actions![0]!.id).toBe("ping");
  });

  it("sends while the agent is not running, since a quiet run is the point", () => {
    const send = vi.fn(async () => ({ ok: true, delivery: "sent" }));
    const slot = renderComposer({ isRunning: false, send });
    const button = pingButton(slot);
    expect(button.disabled).toBe(false);
    expect(button.title).toMatch(/начнёт новый ход/);
    fireEvent.click(button);
    expect(send).toHaveBeenCalledWith({
      threadId: "thr_42",
      mode: "steer-if-active",
      input: [{ type: "text", text: DEFAULT_PING_MESSAGE, mentions: [] }],
    });
  });

  it("says when the running turn was steered", async () => {
    const send = vi.fn(async () => ({ ok: true, delivery: "sent" }));
    const slot = renderComposer({
      isRunning: true,
      send,
      settings: { message: "Статус?" },
    });
    expect(pingButton(slot).disabled).toBe(false);
    fireEvent.click(pingButton(slot));
    expect(send).toHaveBeenCalledWith({
      threadId: "thr_42",
      mode: "steer-if-active",
      input: [{ type: "text", text: "Статус?", mentions: [] }],
    });
    await vi.waitFor(() => expect(success).toHaveBeenCalled());
  });

  it("says when the request was queued instead of steered", async () => {
    const send = vi.fn(async () => ({ ok: true, delivery: "queued" }));
    const slot = renderComposer({ isRunning: true, send });
    fireEvent.click(pingButton(slot));
    await vi.waitFor(() => expect(success).toHaveBeenCalledTimes(1));
    expect(String(success.mock.calls[0]![0])).toMatch(/очереди/i);
  });

  it("surfaces a failed send and re-enables the button", async () => {
    const send = vi.fn(async () => {
      throw new Error("thread is archived");
    });
    const slot = renderComposer({ isRunning: true, send });
    fireEvent.click(pingButton(slot));
    await vi.waitFor(() => expect(error).toHaveBeenCalledWith("thread is archived"));
    expect(pingButton(slot).disabled).toBe(false);
  });

  it("ignores a second click while a request is in flight", async () => {
    let release: () => void = () => {};
    const send = vi.fn(
      () => new Promise((resolve) => {
        release = () => resolve({ ok: true, delivery: "sent" });
      }),
    );
    const slot = renderComposer({ isRunning: true, send });
    fireEvent.click(pingButton(slot));
    expect(send).toHaveBeenCalledTimes(1);
    fireEvent.click(pingButton(slot));
    expect(send).toHaveBeenCalledTimes(1);
    release();
    await vi.waitFor(() => expect(success).toHaveBeenCalled());
  });
});

describe("ping message default", () => {
  it("falls back to the built-in wording for blank settings", () => {
    expect(resolvePingMessage(undefined)).toBe(DEFAULT_PING_MESSAGE);
    expect(resolvePingMessage("   ")).toBe(DEFAULT_PING_MESSAGE);
    expect(resolvePingMessage("go on")).toBe("go on");
  });
});
