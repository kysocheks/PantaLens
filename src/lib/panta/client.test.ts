import { describe, expect, it } from "vitest";

import { PantaConfigurationError } from "./errors";
import { parsePantaConfig } from "./config";

describe("Panta server configuration", () => {
  it("fails closed when the key is missing or malformed", () => {
    expect(() =>
      parsePantaConfig("https://api.example.test", undefined),
    ).toThrow(PantaConfigurationError);

    expect(() =>
      parsePantaConfig("https://api.example.test", "not-a-panta-key"),
    ).toThrow(PantaConfigurationError);
  });

  it("requires HTTPS and identifies a valid test-key prefix", () => {
    expect(() =>
      parsePantaConfig("http://api.example.test", "pk_test_x"),
    ).toThrow(PantaConfigurationError);

    expect(parsePantaConfig("https://api.example.test/", "pk_test_x")).toEqual({
      apiKey: "pk_test_x",
      baseUrl: "https://api.example.test",
    });
  });
});
