const express = require("express");

const { AppError, isAppError } = require("./errors");
const { normalizeReelUrl, parseInstagramReelUrl } = require("./url");

function createResolveHandler({ resolver, config = {} }) {
  return async function resolveHandler(req, res, next) {
    const inputUrl = req.query.url;
    if (!inputUrl || typeof inputUrl !== "string") {
      next(
        new AppError("Missing required query parameter: url", {
          code: "INVALID_INPUT",
          status: 400,
          stage: "validate_input",
        }),
      );
      return;
    }

    const parsed = parseInstagramReelUrl(inputUrl);
    if (!parsed) {
      next(
        new AppError("URL must be a valid Instagram Reel URL", {
          code: "INVALID_INPUT",
          status: 400,
          stage: "validate_input",
        }),
      );
      return;
    }

    const normalizedUrl = normalizeReelUrl(inputUrl);

    try {
      const result = await resolver({
        inputUrl,
        normalizedUrl,
        reelId: parsed.reelId,
        config,
      });

      res.json({
        inputUrl,
        normalizedUrl,
        videoUrl: result.videoUrl,
        method: result.method,
      });
    } catch (error) {
      next(error);
    }
  };
}

function createErrorHandler(config = {}) {
  return (error, _req, res, _next) => {
    const handled = isAppError(error)
      ? error
      : new AppError("Unexpected resolver failure", {
          code: "INTERNAL_ERROR",
          status: 500,
          stage: "unhandled",
          cause: error,
        });

    if (config.debug) {
      console.error(handled);
    }

    res.status(handled.status).json({
      error: {
        code: handled.code,
        message: handled.message,
        stage: handled.stage,
      },
    });
  };
}

function createApp({ resolver, config = {} }) {
  if (typeof resolver !== "function") {
    throw new Error("resolver must be a function");
  }

  const app = express();
  const resolveHandler = createResolveHandler({ resolver, config });
  const errorHandler = createErrorHandler(config);

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/resolve", resolveHandler);
  app.use(errorHandler);

  return app;
}

module.exports = {
  createApp,
  createErrorHandler,
  createResolveHandler,
};
