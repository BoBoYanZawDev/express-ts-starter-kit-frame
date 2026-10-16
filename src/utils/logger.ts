import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "node:path";
import { env } from "../config/env";

const logger = winston.createLogger({
  level: env.logLevel,
  silent: env.nodeEnv === "test",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [new winston.transports.Console()],
});
if (env.logToFile && env.nodeEnv !== "test") {
  logger.add(new DailyRotateFile({
    filename: path.join(process.cwd(), "logs/app-%DATE%.log"),
    datePattern: "YYYY-MM-DD", maxSize: "20m", maxFiles: "14d",
  }));
  logger.add(new DailyRotateFile({
    filename: path.join(process.cwd(), "logs/error-%DATE%.log"),
    datePattern: "YYYY-MM-DD", level: "error", maxSize: "20m", maxFiles: "30d",
  }));
}
export default logger;
