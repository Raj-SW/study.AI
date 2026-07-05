import pino, { type Logger } from 'pino';
import { getAiConfig } from './config';

// Constructed lazily, on first log call, so that importing ai-engine never
// triggers env validation — `pino()` would otherwise throw on an invalid
// LOG_LEVEL before config.ts's validation (with its clearer error) gets a
// chance to run. See getAiConfig()'s own lazy-parse-on-first-access design.
let instance: Logger | null = null;

function createLogger(): Logger {
  const config = getAiConfig();
  const isTest = config.NODE_ENV === 'test';
  const isDev = config.NODE_ENV === 'development';

  return pino({
    name: 'ai-engine',
    level: isTest ? 'silent' : config.LOG_LEVEL,
    transport:
      isDev && !isTest
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  });
}

export const logger: Logger = new Proxy({} as Logger, {
  get(_target, prop) {
    if (!instance) instance = createLogger();
    const value = Reflect.get(instance, prop, instance);
    // pino's methods read internal state via `this` — bind so `logger.info(...)`
    // (called without `instance` as receiver) still works correctly.
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});
