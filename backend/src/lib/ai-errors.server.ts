/** Extract only non-sensitive status metadata, including SDK retry wrappers. */
export function providerStatus(error: unknown): number | undefined {
  let current = error;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth++) {
    const value = current as {
      statusCode?: unknown;
      lastError?: unknown;
      cause?: unknown;
      errors?: unknown[];
    };
    if (typeof value.statusCode === "number") return value.statusCode;
    current = value.lastError ?? value.cause ?? value.errors?.at(-1);
  }
  return undefined;
}
