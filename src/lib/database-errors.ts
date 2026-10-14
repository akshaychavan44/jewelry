export const DATABASE_UNAVAILABLE_MESSAGE = "We can't connect to the directory right now. Check your internet connection and try again.";

export class DatabaseUnavailableError extends Error {
  constructor(cause: unknown) {
    super("The database connection is unavailable.", { cause });
    this.name = "DatabaseUnavailableError";
  }
}

/** Match transport failures, including errors wrapped by Auth.js. SQL errors
 * must keep their original meaning instead of being reported as connectivity. */
export function isDatabaseUnavailable(error: unknown, depth = 0): boolean {
  if (!error || typeof error !== "object" || depth > 5) return false;
  if (error instanceof DatabaseUnavailableError) return true;
  const detail = error as { name?: string; code?: string; message?: string; cause?: unknown; err?: unknown };
  if (["ENOTFOUND", "EAI_AGAIN", "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EPIPE", "UND_ERR_CONNECT_TIMEOUT"].includes(detail.code ?? "")) return true;
  if (detail.name === "ErrorEvent" || detail.name === "TimeoutError" || /Error connecting to database|Connection terminated unexpectedly|Connection terminated due to connection timeout/i.test(detail.message ?? "")) return true;
  return isDatabaseUnavailable(detail.cause, depth + 1) || isDatabaseUnavailable(detail.err, depth + 1);
}
