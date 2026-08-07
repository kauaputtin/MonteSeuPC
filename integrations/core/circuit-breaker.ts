export class CircuitBreaker {
  private failures = 0;
  private openedAt: number | null = null;
  constructor(private readonly failureThreshold = 5, private readonly resetAfterMs = 60_000, private readonly now: () => number = Date.now) {}

  get state() {
    if (this.openedAt === null) return "closed" as const;
    if (this.now() - this.openedAt >= this.resetAfterMs) return "half_open" as const;
    return "open" as const;
  }

  async execute<T>(operation: () => Promise<T>) {
    if (this.state === "open") throw new Error("Circuit breaker aberto para este provider.");
    try {
      const value = await operation();
      this.failures = 0; this.openedAt = null;
      return value;
    } catch (error) {
      this.failures += 1;
      if (this.failures >= this.failureThreshold) this.openedAt = this.now();
      throw error;
    }
  }
}
