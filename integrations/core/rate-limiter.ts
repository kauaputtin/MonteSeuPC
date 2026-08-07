export interface RateLimiterOptions { capacity: number; refillPerSecond: number; now?: () => number; }

export class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly now: () => number;

  constructor(private readonly options: RateLimiterOptions) {
    if (options.capacity <= 0 || options.refillPerSecond <= 0) throw new Error("Configuração de rate limit inválida.");
    this.tokens = options.capacity;
    this.now = options.now ?? Date.now;
    this.lastRefill = this.now();
  }

  private refill() {
    const current = this.now();
    const elapsed = Math.max(0, current - this.lastRefill) / 1000;
    this.tokens = Math.min(this.options.capacity, this.tokens + elapsed * this.options.refillPerSecond);
    this.lastRefill = current;
  }

  tryAcquire(cost = 1) {
    this.refill();
    if (cost <= 0 || this.tokens < cost) return false;
    this.tokens -= cost;
    return true;
  }

  millisecondsUntilAvailable(cost = 1) {
    this.refill();
    if (this.tokens >= cost) return 0;
    return Math.ceil(((cost - this.tokens) / this.options.refillPerSecond) * 1000);
  }

  async acquire(cost = 1, maxWaitMs = 10_000) {
    if (cost <= 0 || cost > this.options.capacity) throw new Error("Custo de requisição inválido para o provider.");
    let remainingWaitMs = maxWaitMs;
    while (!this.tryAcquire(cost)) {
      // O timer pode acordar uma fração de milissegundo antes de o token estar
      // completo. Nesse caso, aguarda o restante em vez de falhar a categoria.
      const wait = Math.max(1, this.millisecondsUntilAvailable(cost));
      if (wait > remainingWaitMs) throw new Error("Limite de requisições do provider atingido.");
      await new Promise((resolve) => setTimeout(resolve, wait));
      remainingWaitMs -= wait;
    }
  }
}
