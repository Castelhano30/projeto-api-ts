import { createApp } from "./app";
import { env } from "./config/env";

const app = createApp();

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Servidor rodando em http://localhost:${env.port}`);
  // eslint-disable-next-line no-console
  console.log(`Documentacao Swagger disponivel em http://localhost:${env.port}/docs`);
});
