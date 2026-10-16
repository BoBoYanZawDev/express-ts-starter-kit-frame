import { app } from "./app";
import { env } from "./config/env";
import logger from "./utils/logger";
import { prisma } from "./lib/prisma";

const server = app.listen(env.port, () => {
  logger.info(`Server ready at http://localhost:${env.port}/api/v1`);
});
server.on("error", (error) => {
  logger.error("Server failed to start", { message: error.message });
  process.exitCode = 1;
});
let shuttingDown = false;
function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received; closing HTTP server`);
  const timeout = setTimeout(() => {
    logger.error("Graceful shutdown timed out");
    process.exit(1);
  }, 10_000);
  timeout.unref();
  server.close(() => {
    void prisma.$disconnect().then(() => {
      clearTimeout(timeout);
      logger.info("HTTP server and database pool closed");
    }).catch((error: unknown) => {
      logger.error("Database shutdown failed", { message: error instanceof Error ? error.message : "Unknown error" });
      process.exit(1);
    });
  });
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
