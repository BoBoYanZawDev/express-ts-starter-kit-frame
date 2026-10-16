import { rateLimit } from "express-rate-limit";
import { env } from "../config/env";
import { errorCode } from "../../config/errorCode";

export const limiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  limit: env.rateLimitMax,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler(_req, res) {
    res.status(429).json({
      message: "Too many requests. Please try again later.",
      error: errorCode.overLimit,
    });
  },
});
