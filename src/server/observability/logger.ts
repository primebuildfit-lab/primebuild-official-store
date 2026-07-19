import "server-only";

/**
 * Minimal structured logger for PrimeBuild Official Store. Server-only. Writes
 * concise JSON lines to the process console; never logs secrets (callers must
 * not pass tokens in `context`).
 */
type Level = "info" | "warn" | "error";

function emit(level: Level, message: string, context?: Record<string, unknown>) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...(context ? { context } : {}),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info(message: string, meta?: { context?: Record<string, unknown> }) {
    emit("info", message, meta?.context);
    return Promise.resolve();
  },
  warn(message: string, meta?: { context?: Record<string, unknown> }) {
    emit("warn", message, meta?.context);
    return Promise.resolve();
  },
  error(message: string, meta?: { context?: Record<string, unknown> }) {
    emit("error", message, meta?.context);
    return Promise.resolve();
  },
};
