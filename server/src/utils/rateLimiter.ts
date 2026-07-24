// Simple in-memory token bucket, keyed per socket.id — the friend-group-
// scale equivalent of the REST @fastify/rate-limit plugin, for socket
// events that have no built-in throttling (chat/guess submission, votekick).
// No Redis: state lives in the same process as the rooms it protects.
class TokenBucket {
  private tokens: number;
  private lastRefill = Date.now();

  constructor(private readonly capacity: number, private readonly refillPerSec: number) {
    this.tokens = capacity;
  }

  tryConsume(cost = 1): boolean {
    const now = Date.now();
    const elapsedSec = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSec * this.refillPerSec);
    this.lastRefill = now;
    if (this.tokens < cost) return false;
    this.tokens -= cost;
    return true;
  }
}

export class RateLimiterRegistry {
  private buckets = new Map<string, TokenBucket>();

  constructor(private readonly capacity: number, private readonly refillPerSec: number) {}

  check(key: string): boolean {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = new TokenBucket(this.capacity, this.refillPerSec);
      this.buckets.set(key, bucket);
    }
    return bucket.tryConsume();
  }

  remove(key: string): void {
    this.buckets.delete(key);
  }
}

// Chat/guess: generous burst (typing fast + a flurry of guesses is normal
// play), refills quickly since correct-guess spam has no upside for an
// attacker anyway (it's rate-limited by game logic, not just abuse).
export const chatRateLimiter = new RateLimiterRegistry(15, 3);

// Votekick: much stricter — this is a moderation action, not gameplay input.
export const votekickRateLimiter = new RateLimiterRegistry(5, 0.5);
