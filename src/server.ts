import { createApp } from "./app";
import { env } from "./config/env";
import { connectDatabase } from "./config/database";

async function main(): Promise<void> {
  await connectDatabase();

  const app = createApp();

  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Servidor rodando em http://localhost:${env.port}`);
    // eslint-disable-next-line no-console
    console.log(`Documentacao Swagger disponivel em http://localhost:${env.port}/docs`);
  });
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
