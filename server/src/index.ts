import { Server } from "socket.io";
import { buildApp } from "./app.js";
import { config } from "./config.js";
import { migrate } from "./db/migrate.js";
import { attachSocketHandlers } from "./sockets/index.js";
import { logger } from "./utils/logger.js";

async function main() {
  migrate();

  const app = await buildApp();
  await app.listen({ port: config.port, host: "0.0.0.0" });

  const io = new Server(app.server, {
    cors: { origin: config.corsOrigin },
  });
  attachSocketHandlers(io);

  logger.info(`Fastify + socket.io listening on :${config.port}`);
}

main().catch((err) => {
  logger.error("Fatal startup error", err);
  process.exit(1);
});
