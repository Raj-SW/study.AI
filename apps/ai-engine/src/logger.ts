import pino from 'pino';

const isTest = process.env.NODE_ENV === 'test';
const isDev = (process.env.NODE_ENV ?? 'development') === 'development';

export const logger = pino({
  name: 'ai-engine',
  level: isTest ? 'silent' : (process.env.LOG_LEVEL ?? 'info'),
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
