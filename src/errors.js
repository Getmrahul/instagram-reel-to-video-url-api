class AppError extends Error {
  constructor(message, { code, status, stage, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = "AppError";
    this.code = code || "INTERNAL_ERROR";
    this.status = status || 500;
    this.stage = stage || "unknown";
  }
}

function isAppError(error) {
  return error instanceof AppError;
}

module.exports = {
  AppError,
  isAppError,
};
