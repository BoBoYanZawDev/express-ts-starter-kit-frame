import express from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { limiter } from "./middlewares/rateLimiter";
import { requestId } from "./middlewares/requestId";
import { errorHandler, notFound } from "./middlewares/errorHandler";
import { createError } from "./utils/error";
import { errorCode } from "../config/errorCode";
import logger from "./utils/logger";
import router from "./routes/v1";

export const app = express();
app.disable("x-powered-by");
// Configure only for a known number of trusted reverse proxy hops.
app.set("trust proxy", env.trustProxyHops);
app.use(requestId);
app.use(helmet());
app.use(morgan("short", { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.corsOrigins.includes(origin) || env.corsOrigins.includes("*")) {
      callback(null, true);
      return;
    }
    callback(createError("Origin is not allowed.", 403, errorCode.unauthorised));
  },
  credentials: !env.corsOrigins.includes("*"),
  exposedHeaders: ["X-Request-Id"],
}));
app.use(compression());
app.use("/api", limiter);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(cookieParser());
app.use(router);
app.use(notFound);
app.use(errorHandler);
