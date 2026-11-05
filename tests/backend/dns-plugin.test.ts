import { describe, expect, it, vi } from "vitest";
import { createTxtRecordWithDnsPlugin } from "../../src/backend/dns-plugin.js";

function ctxWith(providers: string[], service: object) {
  return {
    services: {
      providers: () => providers,
      get: () => service,
    },
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
});
