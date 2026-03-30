const { chromium, devices } = require("playwright");

const { AppError } = require("./errors");

const MOBILE_DEVICE = devices["iPhone 13"];
const BLOCKED_PATH_RE = /(login|challenge|accounts\/suspended|consent)/i;
const DIRECT_VIDEO_RE = /(\.mp4($|\?)|mime_type=video|video_versions|\/v\/t\d+\.\d+-\d+\/)/i;

function logDebug(config, message, extra) {
  if (!config.debug) {
    return;
  }

  console.log(message, extra || "");
}

function isDirectVideoUrl(value) {
  if (!value || typeof value !== "string") {
    return false;
  }

  if (value.startsWith("blob:")) {
    return false;
  }

  return /^https?:\/\//.test(value) && DIRECT_VIDEO_RE.test(value);
}

function isReusableHttpUrl(value) {
  return Boolean(value && typeof value === "string" && /^https?:\/\//.test(value) && !value.startsWith("blob:"));
}

function pickDirectVideoUrl(candidates) {
  for (const candidate of candidates) {
    if (isDirectVideoUrl(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function readVideoFromDom(page) {
  return page.evaluate(() => {
    const video = document.querySelector("video");
    if (!video) {
      return null;
    }

    const sources = Array.from(video.querySelectorAll("source"))
      .map((source) => source.src)
      .filter(Boolean);

    return [video.currentSrc, video.src, ...sources].find(Boolean) || null;
  });
}

async function detectBlockedPage(page) {
  const currentUrl = page.url();
  if (BLOCKED_PATH_RE.test(currentUrl)) {
    return true;
  }

  const bodyText = await page.evaluate(() => document.body?.innerText || "");
  return /login|log in|sign up|challenge/i.test(bodyText);
}

function classifyNavigationError(error) {
  if (error instanceof AppError) {
    return error;
  }

  if (error && error.name === "TimeoutError") {
    return new AppError("Extraction timed out", {
      code: "TIMEOUT",
      status: 504,
      stage: "navigate",
      cause: error,
    });
  }

  return new AppError("Unexpected resolver failure", {
    code: "INTERNAL_ERROR",
    status: 500,
    stage: "navigate",
    cause: error,
  });
}

function buildLaunchOptions(config) {
  const launchOptions = {
    headless: config.headless,
  };

  if (config.browserChannel) {
    launchOptions.channel = config.browserChannel;
  }

  if (config.browserExecutablePath) {
    launchOptions.executablePath = config.browserExecutablePath;
  }

  return launchOptions;
}

async function launchBrowser(config) {
  const primaryOptions = buildLaunchOptions(config);

  try {
    return await chromium.launch(primaryOptions);
  } catch (error) {
    const hasExplicitBrowser =
      Boolean(config.browserChannel) || Boolean(config.browserExecutablePath);

    if (hasExplicitBrowser) {
      throw error;
    }

    return chromium.launch({
      headless: config.headless,
      channel: "chrome",
    });
  }
}

function createResolver(config) {
  return async function resolveReel({ normalizedUrl }) {
    let browser;
    let context;
    let page;
    const networkCandidates = [];

    try {
      browser = await launchBrowser(config);
      context = await browser.newContext({
        ...MOBILE_DEVICE,
        viewport: { width: 390, height: 844 },
        locale: "en-US",
      });
      page = await context.newPage();
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      });
      await page.setExtraHTTPHeaders({
        "Accept-Language": "en-US,en;q=0.9",
      });

      page.on("response", (response) => {
        const responseUrl = response.url();
        const headers = response.headers();
        const contentType = headers["content-type"] || "";
        if (contentType.includes("video") || isDirectVideoUrl(responseUrl)) {
          networkCandidates.push(responseUrl);
        }
      });

      logDebug(config, "Navigating to reel", normalizedUrl);
      await page.goto(normalizedUrl, {
        waitUntil: "domcontentloaded",
        timeout: config.browserTimeoutMs,
      });

      await page.waitForLoadState("networkidle", {
        timeout: Math.min(config.browserTimeoutMs, 5000),
      }).catch(() => {});

      await page.waitForSelector("video", {
        timeout: Math.min(config.browserTimeoutMs, 5000),
      }).catch(() => {});

      const domUrl = await readVideoFromDom(page);
      if (isReusableHttpUrl(domUrl)) {
        return {
          videoUrl: domUrl,
          method: "dom",
        };
      }

      const networkUrl = pickDirectVideoUrl(networkCandidates);
      if (networkUrl) {
        return {
          videoUrl: networkUrl,
          method: "network",
        };
      }

      if (await detectBlockedPage(page)) {
        throw new AppError("Instagram blocked extraction for this reel", {
          code: "UPSTREAM_BLOCKED",
          status: 502,
          stage: "blocked_page",
        });
      }

      throw new AppError("Direct video URL not found", {
        code: "EXTRACTION_FAILED",
        status: 404,
        stage: "network_fallback",
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (page && (await detectBlockedPage(page).catch(() => false))) {
        throw new AppError("Instagram blocked extraction for this reel", {
          code: "UPSTREAM_BLOCKED",
          status: 502,
          stage: "blocked_page",
        });
      }

      throw classifyNavigationError(error);
    } finally {
      if (context) {
        await context.close().catch(() => {});
      }

      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  };
}

module.exports = {
  createResolver,
  isDirectVideoUrl,
  pickDirectVideoUrl,
};
