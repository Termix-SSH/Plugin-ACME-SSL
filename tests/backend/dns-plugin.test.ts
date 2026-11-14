import { describe, expect, it, vi } from "vitest";
import { createTxtRecordWithDnsPlugin } from "../../src/backend/dns-plugin.js";

function ctxWith(
  providers: string[],
  service: object,
  options: {
    actor?: string;
    stored?: unknown;
    get?: ReturnType<typeof vi.fn>;
  } = {
    actor: "admin",
  },
) {
  // Async like in a plugin process, where every services call is a promise.
  return {
    services: {
      providers: async () => providers,
      get: options.get ?? (async () => service),
    },
    kv: { get: async () => options.stored ?? null, set: vi.fn() },
    currentActor: () => options.actor,
  } as never;
}

describe("createTxtRecordWithDnsPlugin", () => {
  it("adds the record and removes it with the same handle", async () => {
    const setRecord = vi.fn(async () => ({ id: "h1" }));
    const removeRecord = vi.fn(async () => undefined);
    const remove = await createTxtRecordWithDnsPlugin(
      ctxWith([""], { setRecord, removeRecord }),
      "_acme-challenge.example.com",
      "digest",
    );
    expect(setRecord).toHaveBeenCalledWith({
      name: "_acme-challenge.example.com",
      type: "TXT",
      content: "digest",
      ttl: 120,
    });
    await remove();
    expect(removeRecord).toHaveBeenCalledWith({ id: "h1" });
  });

  it("explains when the DNS plugin is not running", async () => {
    await expect(
      createTxtRecordWithDnsPlugin(ctxWith([], {}), "x", "y"),
    ).rejects.toThrow(/DNS plugin is not running/);
  });

  it("acts as the user who last asked when no one is acting", async () => {
    const service = {
      setRecord: vi.fn(async () => ({})),
      removeRecord: vi.fn(),
    };
    const get = vi.fn(() => service);
    await createTxtRecordWithDnsPlugin(
      ctxWith([""], service, { stored: "u1", get }),
      "_acme-challenge.example.com",
      "digest",
    );
    expect(get).toHaveBeenCalledWith("dns.records", { userId: "u1" });
  });

  it("asks for a manual request first when no user is known", async () => {
    await expect(
      createTxtRecordWithDnsPlugin(ctxWith([""], {}, {}), "x", "y"),
    ).rejects.toThrow(/by hand/);
  });
});
