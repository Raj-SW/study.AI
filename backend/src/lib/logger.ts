import pino from 'pino';
import { config } from '../config';

export const logger = pino({
  level: config.LOG_LEVEL,
  transport: config.isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'email', 'password', 'token'],
    censor: '[REDACTED]',
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      // No body logging to avoid PII
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});
