export class PantaConfigurationError extends Error {
  readonly code = "CONFIGURATION_REQUIRED";

  constructor() {
    super("Panta API environment variables are not configured on the server.");
    this.name = "PantaConfigurationError";
  }
}

export class PantaTimeoutError extends Error {
  readonly code = "UPSTREAM_TIMEOUT";

  constructor() {
    super("Panta did not respond before the request timeout.");
    this.name = "PantaTimeoutError";
  }
}

export class PantaApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "PantaApiError";
  }
}

export type PublicApiError = {
  code: string;
  message: string;
  status: number;
  retryAfterSeconds?: number;
};

export function toPublicApiError(error: unknown): PublicApiError {
  if (error instanceof PantaConfigurationError) {
    return {
      code: error.code,
      message:
        "Panta Lens needs server-side PANTA_API_BASE_URL and PANTA_API_KEY values.",
      status: 503,
    };
  }

  if (error instanceof PantaTimeoutError) {
    return { code: error.code, message: error.message, status: 504 };
  }

  if (error instanceof PantaApiError) {
    return {
      code: error.code,
      message: error.message,
      status: error.status,
      ...(error.retryAfterSeconds === undefined
        ? {}
        : { retryAfterSeconds: error.retryAfterSeconds }),
    };
  }

  return {
    code: "INTERNAL_ERROR",
    message: "Panta Lens could not complete the request.",
    status: 500,
  };
}
