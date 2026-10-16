import type { ErrorRequestHandler, RequestHandler } from "express";
import { Prisma } from "../generated/prisma/client";
import { errorCode } from "../../config/errorCode";
import { createError, isHttpError } from "../utils/error";
import logger from "../utils/logger";

export const notFound: RequestHandler = (_req, _res, next) => {
  next(createError("Route not found.", 404, errorCode.notFound));
};

export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, next) => {
  if (res.headersSent) return next(err);
  let status = 500;
  let message = "Internal server error";
  let code: string = errorCode.internal;

  if (isHttpError(err)) {
    status = err.status;
    message = err.message;
    code = err.code;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") {
      status = 404;
      message = "This model does not exist.";
      code = errorCode.notFound;
    } else if (err.code === "P2002" || err.code === "P2003") {
      status = 409;
      message = "The request conflicts with existing data.";
      code = errorCode.conflict;
    }
  } else if (err && typeof err === "object" && "type" in err) {
    if (err.type === "entity.parse.failed") {
      status = 400;
      message = "Request body must contain valid JSON.";
      code = errorCode.invalid;
    } else if (err.type === "entity.too.large") {
      status = 413;
      message = "Request body is too large.";
      code = errorCode.invalid;
    }
  }
  if (status >= 500) {
    logger.error("Request failed", {
      requestId: res.locals.requestId, method: req.method, path: req.path,
      message: err instanceof Error ? err.message : "Unknown error",
      stack: err instanceof Error ? err.stack : undefined,
    });
  }
  res.status(status).json({ message, error: code });
};
