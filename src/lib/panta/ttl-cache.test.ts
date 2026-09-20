import { describe, expect, it, vi } from "vitest";

import { createTtlCache } from "./ttl-cache";

describe("createTtlCache", () => {
  it("reuses a resolved value until its TTL expires", async () => {
    let time = 1_000;
    const cache = createTtlCache<string>(100, () => time);
    const load = vi.fn(async () => "market detail");

    await expect(cache.get("market", load)).resolves.toBe("market detail");
    await expect(cache.get("market", load)).resolves.toBe("market detail");
    expect(load).toHaveBeenCalledTimes(1);

    time += 101;
    await expect(cache.get("market", load)).resolves.toBe("market detail");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("deduplicates concurrent requests for the same key", async () => {
    const cache = createTtlCache<string>(100);
    let resolve!: (value: string) => void;
    const load = vi.fn(
      () =>
        new Promise<string>((completion) => {
          resolve = completion;
        }),
    );

    const first = cache.get("market", load);
    const second = cache.get("market", load);
    resolve("market detail");

    await expect(Promise.all([first, second])).resolves.toEqual([
      "market detail",
      "market detail",
    ]);
    expect(load).toHaveBeenCalledTimes(1);
  });
});
