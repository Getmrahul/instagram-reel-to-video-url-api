const test = require("node:test");
const assert = require("node:assert/strict");

const { createErrorHandler, createResolveHandler } = require("../src/app");
const { AppError } = require("../src/errors");

function createResponseRecorder() {
  const response = {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };

  return response;
}

async function invokeResolve(handler, query = {}) {
  const req = { query };
  const res = createResponseRecorder();
  let forwardedError = null;

  await handler(req, res, (error) => {
    forwardedError = error;
  });

  return { res, forwardedError };
}

test("resolve handler forwards 400 error when url is missing", async () => {
  const handler = createResolveHandler({
    resolver: async () => {
      throw new Error("should not be called");
    },
  });

  const { forwardedError } = await invokeResolve(handler);
  assert.equal(forwardedError.status, 400);
  assert.equal(forwardedError.code, "INVALID_INPUT");
  assert.equal(forwardedError.message, "Missing required query parameter: url");
});

test("resolve handler forwards 400 for a non-reel url", async () => {
  const handler = createResolveHandler({
    resolver: async () => {
      throw new Error("should not be called");
    },
  });

  const { forwardedError } = await invokeResolve(handler, {
    url: "https://www.instagram.com/p/abc123/",
  });

  assert.equal(forwardedError.status, 400);
  assert.equal(forwardedError.code, "INVALID_INPUT");
});

test("resolve handler returns resolver payload", async () => {
  const handler = createResolveHandler({
    resolver: async ({ inputUrl, normalizedUrl }) => ({
      videoUrl: "https://cdn.example.com/video.mp4",
      method: normalizedUrl.includes("?l=1") ? "dom" : "network",
      inputUrl,
    }),
  });

  const reelUrl = "https://www.instagram.com/reel/Cr4zyID/";
  const { res, forwardedError } = await invokeResolve(handler, { url: reelUrl });
  assert.equal(forwardedError, null);
  assert.deepEqual(res.payload, {
    inputUrl: reelUrl,
    normalizedUrl: "https://www.instagram.com/reel/Cr4zyID/?l=1",
    videoUrl: "https://cdn.example.com/video.mp4",
    method: "dom",
  });
});

test("error handler maps AppError into structured JSON", () => {
  const handler = createErrorHandler();
  const res = createResponseRecorder();

  handler(
    new AppError("Direct video URL not found", {
      code: "EXTRACTION_FAILED",
      status: 404,
      stage: "network_fallback",
    }),
    {},
    res,
    () => {},
  );

  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.payload, {
    error: {
      code: "EXTRACTION_FAILED",
      message: "Direct video URL not found",
      stage: "network_fallback",
    },
  });
});
