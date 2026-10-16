export interface HttpError extends Error {
  status: number;
  code: string;
}

export const createError = (message: string, status: number, code: string): HttpError => {
  return Object.assign(new Error(message), { status, code });
};

export const isHttpError = (error: unknown): error is HttpError => {
  return error instanceof Error && "status" in error &&
    typeof error.status === "number" && Number.isInteger(error.status) &&
    error.status >= 400 && error.status <= 599 &&
    "code" in error && typeof error.code === "string";
};
