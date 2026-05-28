/**
 * H.E.R.S.365 Structured Logger
 * Production-ready logging with levels, timestamps, and context
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const currentLevel = process.env.LOG_LEVEL 
  ? LogLevel[process.env.LOG_LEVEL as keyof typeof LogLevel] 
  : LogLevel.INFO;

interface LogContext {
  userId?: number;
  requestId?: string;
  [key: string]: any;
}

function formatMessage(level: string, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const ctxStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] ${level}: ${message}${ctxStr}`;
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    if (currentLevel <= LogLevel.DEBUG) {
      console.debug(formatMessage('DEBUG', message, context));
    }
  },

  info(message: string, context?: LogContext): void {
    if (currentLevel <= LogLevel.INFO) {
      console.info(formatMessage('INFO', message, context));
    }
  },

  warn(message: string, context?: LogContext): void {
    if (currentLevel <= LogLevel.WARN) {
      console.warn(formatMessage('WARN', message, context));
    }
  },

  error(message: string, error?: Error | LogContext): void {
    if (currentLevel <= LogLevel.ERROR) {
      const context = error instanceof Error 
        ? { message: error.message, stack: error.stack }
        : error;
      console.error(formatMessage('ERROR', message, context));
    }
  },
};

/**
 * User-safe error handler - never exposes internal details to clients
 */
export function handleError(error: Error, userMessage = 'An unexpected error occurred'): {
  userMessage: string;
  internalLog: string;
} {
  const isDev = process.env.NODE_ENV !== 'production';
  
  return {
    userMessage, // Safe message for UI
    internalLog: isDev ? `${error.message}\n${error.stack}` : `Error: ${error.message}`, // Detailed for logs
  };
}

/**
 * Async wrapper with automatic error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  userMessage = 'Operation failed'
): Promise<{ data?: T; error?: string }> {
  try {
    const data = await fn();
    return { data };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    const { internalLog } = handleError(error, userMessage);
    logger.error(internalLog);
    return { error: userMessage };
  }
}