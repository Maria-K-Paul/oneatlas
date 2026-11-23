export type ErrorCode = "VALIDATION_ERROR" | "NOT_FOUND" | "INTERNAL_ERROR";

export type ErrorDetail = { path: string; message: string };

/** The one error shape every API endpoint returns (docs §7). */
export type ErrorBody = {
  error: { code: ErrorCode; message: string; details?: ErrorDetail[] };
};

/** An error that is safe to show to API clients, with its HTTP status. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details?: ErrorDetail[];

  constructor(status: number, code: ErrorCode, message: string, details?: ErrorDetail[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Resource not found") {
    super(404, "NOT_FOUND", message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details: ErrorDetail[] = []) {
    super(400, "VALIDATION_ERROR", message, details);
    this.name = "ValidationError";
  }
}
