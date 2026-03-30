const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeReelUrl, parseInstagramReelUrl } = require("../src/url");

test("parseInstagramReelUrl accepts instagram reel urls", () => {
  assert.deepEqual(
    parseInstagramReelUrl("https://www.instagram.com/reel/AbC123_/"),
    {
      reelId: "AbC123_",
      canonicalUrl: "https://www.instagram.com/reel/AbC123_/",
    },
  );
});

test("parseInstagramReelUrl rejects non-instagram urls", () => {
  assert.equal(parseInstagramReelUrl("https://example.com/reel/AbC123_/"), null);
});

test("parseInstagramReelUrl rejects non-reel instagram paths", () => {
  assert.equal(parseInstagramReelUrl("https://www.instagram.com/p/AbC123_/"), null);
});

test("normalizeReelUrl produces the mobile variant", () => {
  assert.equal(
    normalizeReelUrl("https://instagram.com/reel/AbC123_/?utm_source=ig_web_copy_link"),
    "https://www.instagram.com/reel/AbC123_/?l=1",
  );
});
