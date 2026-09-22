const MARKET_ID_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{20,64}$/;

export function readMarketSelection(search: string): string | null {
  const value = new URLSearchParams(search).get("market")?.trim();
  return value && MARKET_ID_PATTERN.test(value) ? value : null;
}

export function resolveMarketSelection({
  requestedId,
  currentId,
  visibleIds,
  preserveRequested,
}: {
  requestedId: string | null;
  currentId: string | null;
  visibleIds: string[];
  preserveRequested: boolean;
}): string | null {
  if (preserveRequested && requestedId) return requestedId;
  if (currentId && visibleIds.includes(currentId)) return currentId;
  if (requestedId && visibleIds.includes(requestedId)) return requestedId;
  return visibleIds[0] ?? null;
}

export function updateMarketSelectionUrl(
  currentUrl: string,
  marketId: string | null,
): string {
  const url = new URL(currentUrl);
  if (marketId) url.searchParams.set("market", marketId);
  else url.searchParams.delete("market");
  return `${url.pathname}${url.search}${url.hash}`;
}
