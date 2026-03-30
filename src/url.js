const REEL_PATH_RE = /^\/(?:reel|reels)\/([A-Za-z0-9._-]+)\/?$/;

function parseInstagramReelUrl(value) {
  if (!value) {
    return null;
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const hostname = url.hostname.toLowerCase();
  const allowedHostnames = new Set(["instagram.com", "www.instagram.com"]);
  if (!allowedHostnames.has(hostname)) {
    return null;
  }

  const match = url.pathname.match(REEL_PATH_RE);
  if (!match) {
    return null;
  }

  return {
    reelId: match[1],
    canonicalUrl: `https://www.instagram.com/reel/${match[1]}/`,
  };
}

function normalizeReelUrl(value) {
  const parsed = parseInstagramReelUrl(value);
  if (!parsed) {
    return null;
  }

  return `${parsed.canonicalUrl}?l=1`;
}

module.exports = {
  normalizeReelUrl,
  parseInstagramReelUrl,
};
