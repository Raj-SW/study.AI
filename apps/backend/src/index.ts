// In dev: bypass corporate proxy TLS interception for BOTH https module AND fetch (undici).
// NODE_TLS_REJECT_UNAUTHORIZED=0 only fixes the old https module — undici (used by
// @langchain/openai's fetch calls) needs its own dispatcher.
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
  try {
    // undici is bundled with Node 18+ — no npm install needed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const undici = require('undici') as any;
    undici.setGlobalDispatcher(new undici.Agent({ connect: { rejectUnauthorized: false } }));
  } catch {
    // undici not available — TLS bypass limited to https module only
  }
}

import { createApp } from './app';
import { config } from './config';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';

const app = createApp();

async function start() {
  try {
    // Verify database connection
    await prisma.$connect();
    logger.info('Database connected');

    app.listen(config.PORT, () => {
      logger.info(`Server running on port ${config.PORT} (${config.NODE_ENV})`);
    });
  } catch (err) {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();
