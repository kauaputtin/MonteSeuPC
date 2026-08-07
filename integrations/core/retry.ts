export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitter?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  sleep?: (milliseconds: number) => Promise<void>;
  random?: () => number;
}

export class HttpStatusError extends Error {
  constructor(public readonly status: number, message: string, public readonly retryAfterMs?: number) { super(message); }
}

export async function withRetry<T>(operation: (attempt: number) => Promise<T>, options: RetryOptions = {}) {
  const attempts = options.attempts ?? 3;
  const base = options.baseDelayMs ?? 250;
  const maximum = options.maxDelayMs ?? 5_000;
  const jitter = options.jitter ?? 0.25;
  const random = options.random ?? Math.random;
  const sleep = options.sleep ?? ((milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  const shouldRetry = options.shouldRetry ?? ((error: unknown) => error instanceof HttpStatusError ? error.status === 429 || error.status >= 500 : error instanceof TypeError);
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try { return await operation(attempt); } catch (error) {
      lastError = error;
      if (attempt >= attempts || !shouldRetry(error, attempt)) throw error;
      const exponential = Math.min(maximum, base * 2 ** (attempt - 1));
      const calculated = Math.round(exponential * (1 - jitter + random() * jitter * 2));
      const delay = error instanceof HttpStatusError && error.retryAfterMs !== undefined ? Math.min(maximum, error.retryAfterMs) : calculated;
      await sleep(Math.max(0, delay));
    }
  }
  throw lastError;
}
