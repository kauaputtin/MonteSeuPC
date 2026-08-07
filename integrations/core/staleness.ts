export function advanceOfferStaleness(currentFailures: number, now = new Date()) {
  const consecutiveFailures = Math.max(0, Math.trunc(currentFailures)) + 1;
  return { consecutiveFailures, staleAt: consecutiveFailures >= 3 ? now.toISOString() : null };
}
