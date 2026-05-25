import { app } from './app';
import { disconnectPrisma } from './config/prisma';
import { env, validateRuntimeEnv } from './config/env';

validateRuntimeEnv();

const server = app.listen(env.port, () => {
  console.log(`Backend running on port ${env.port}`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received. Closing server...`);

  server.close(async () => {
    await disconnectPrisma();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
