import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined. Check backend/.env.');
  }

  return databaseUrl;
}

function printSafeDatabaseUrl(databaseUrl: string) {
  const parsedUrl = new URL(databaseUrl);

  console.log('DATABASE_URL loaded: yes');
  console.log(`protocol: ${parsedUrl.protocol}`);
  console.log(`host: ${parsedUrl.hostname}`);
  console.log(`port: ${parsedUrl.port || 'default'}`);
  console.log(`database: ${parsedUrl.pathname.replace('/', '')}`);
  console.log(`schema: ${parsedUrl.searchParams.get('schema') ?? 'not set'}`);
  console.log(`user: ${decodeURIComponent(parsedUrl.username)}`);
  console.log('password: <hidden>');
}

async function main() {
  const databaseUrl = getDatabaseUrl();
  printSafeDatabaseUrl(databaseUrl);

  const prisma = new PrismaClient();

  try {
    const result = await prisma.$queryRaw<
      Array<{
        current_user: string;
        current_database: string;
        server_address: string | null;
        server_port: number;
      }>
    >`
      select
        current_user,
        current_database(),
        inet_server_addr()::text as server_address,
        inet_server_port() as server_port
    `;

    const connection = result[0];

    console.log('Prisma connection: ok');
    console.log(`current_user: ${connection.current_user}`);
    console.log(`current_database: ${connection.current_database}`);
    console.log(`server_address: ${connection.server_address ?? 'local socket/unknown'}`);
    console.log(`server_port: ${connection.server_port}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Prisma connection: failed');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
