import { PantaConfigurationError } from "./errors";

const PANTA_API_KEY_PATTERN = /^pk_(?:test|live)_[A-Za-z0-9_-]+$/;

export type PantaConfig = {
  apiKey: string;
  baseUrl: string;
};

export function parsePantaConfig(
  rawBaseUrl: string | undefined,
  rawApiKey: string | undefined,
): PantaConfig {
  const baseUrl = rawBaseUrl?.trim().replace(/\/$/, "");
  const apiKey = rawApiKey?.trim();

  if (!baseUrl || !apiKey || !PANTA_API_KEY_PATTERN.test(apiKey)) {
    throw new PantaConfigurationError();
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    throw new PantaConfigurationError();
  }

  if (parsedUrl.protocol !== "https:") {
    throw new PantaConfigurationError();
  }

  return { baseUrl, apiKey };
}
