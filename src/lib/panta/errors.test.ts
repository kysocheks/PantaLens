import { describe, expect, it } from "vitest";

import {
  PantaApiError,
  PantaConfigurationError,
  PantaTimeoutError,
  toPublicApiError,
} from "./errors";

describe("toPublicApiError", () => {
  it("keeps authorization failures distinct", () => {
    expect(
      toPublicApiError(
        new PantaApiError(401, "UNAUTHORIZED", "Invalid credentials"),
      ),
    ).toEqual({
      code: "UNAUTHORIZED",
      message: "Invalid credentials",
      status: 401,
    });
  });

  it("keeps upstream transport failures distinct", () => {
    expect(
      toPublicApiError(
        new PantaApiError(
          502,
          "UPSTREAM_UNAVAILABLE",
          "Panta could not be reached.",
        ),
      ),
    ).toEqual({
      code: "UPSTREAM_UNAVAILABLE",
      message: "Panta could not be reached.",
      status: 502,
    });
  });

  it("preserves retry timing for rate limits", () => {
    expect(
      toPublicApiError(new PantaApiError(429, "RATE_LIMITED", "Slow down", 17)),
    ).toEqual({
      code: "RATE_LIMITED",
      message: "Slow down",
      status: 429,
      retryAfterSeconds: 17,
    });
  });

  it("maps configuration and timeout failures", () => {
    expect(toPublicApiError(new PantaConfigurationError()).status).toBe(503);
    expect(toPublicApiError(new PantaTimeoutError())).toMatchObject({
      code: "UPSTREAM_TIMEOUT",
      status: 504,
    });
  });

  it("does not leak unknown internal errors", () => {
    expect(toPublicApiError(new Error("secret internal detail"))).toEqual({
      code: "INTERNAL_ERROR",
      message: "Panta Lens could not complete the request.",
      status: 500,
    });
  });
});
