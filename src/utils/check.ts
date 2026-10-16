import type { Request } from "express";
import { validationResult } from "express-validator";
import { errorCode } from "../../config/errorCode";
import { createError } from "./error";

export const checkValidationErrors = (req: Request) => {
  const errors = validationResult(req).array({ onlyFirstError: true });
  if (errors.length > 0) {
    throw createError(String(errors[0]!.msg), 400, errorCode.invalid);
  }
};

export function checkModelIfExist<T>(model: T, message = "This model does not exist."): asserts model is NonNullable<T> {
  if (model === null || model === undefined) {
    throw createError(message, 404, errorCode.notFound);
  }
}
