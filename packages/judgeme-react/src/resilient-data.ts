import type {
  JudgeMeJsonValue,
  JudgeMeRuntimeSettings,
} from "./legacy-api.js";

export const EMPTY_JUDGE_ME_SETTINGS: JudgeMeRuntimeSettings = Object.freeze(
  {},
);

export async function settleOptionalJudgeMeValue<T>(
  load: () => Promise<T>,
  signal?: AbortSignal,
): Promise<T | null> {
  try {
    return await load();
  } catch (error) {
    if (signal?.aborted) throw signal.reason ?? error;
    return null;
  }
}

export function assertSafePublicHtml(value: string, label: string): void {
  if (
    /<script\b/i.test(value) ||
    /\son[a-z][\w:-]*\s*=/i.test(value) ||
    /\b(?:href|src)\s*=\s*(["'])\s*javascript:/i.test(value)
  ) {
    throw new Error(`Judge.me returned executable ${label} markup.`);
  }
}

export function summarizeRatedRecords(
  records: readonly Readonly<Record<string, JudgeMeJsonValue>>[],
  count = records.length,
): { count: number; rating: number } {
  const ratings = records
    .map((record) => Number(record.rating))
    .filter((rating) => Number.isFinite(rating) && rating >= 1 && rating <= 5);
  return {
    count: Number.isSafeInteger(count) && count >= 0 ? count : records.length,
    rating:
      ratings.length > 0
        ? ratings.reduce((total, rating) => total + rating, 0) / ratings.length
        : 0,
  };
}
