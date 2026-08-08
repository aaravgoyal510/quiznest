import { prisma } from "../db";

/**
 * Persistent PostgreSQL-backed Rate Limiter for serverless / multi-instance environments
 * Locks key after maxAttempts within windowMs
 */
export async function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 10 * 60 * 1000
): Promise<{ allowed: boolean; remainingAttempts: number; retryAfterSec: number }> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  // Lazy prune expired rate limits before checking attempt counts
  await prisma.rateLimit.deleteMany({
    where: { resetAt: { lt: now } },
  });

  const existing = await prisma.rateLimit.findUnique({
    where: { key },
  });

  if (!existing || now > existing.resetAt) {
    await prisma.rateLimit.upsert({
      where: { key },
      update: { count: 1, resetAt },
      create: { key, count: 1, resetAt },
    });
    return { allowed: true, remainingAttempts: maxAttempts - 1, retryAfterSec: 0 };
  }

  if (existing.count >= maxAttempts) {
    const retryAfterSec = Math.ceil((existing.resetAt.getTime() - now.getTime()) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSec };
  }

  const updated = await prisma.rateLimit.update({
    where: { key },
    data: { count: existing.count + 1 },
  });

  return { allowed: true, remainingAttempts: maxAttempts - updated.count, retryAfterSec: 0 };
}

export async function resetRateLimit(key: string): Promise<void> {
  try {
    await prisma.rateLimit.delete({
      where: { key },
    });
  } catch (err) {
    // Ignore record not found error
  }
}
