# Instagram Reel Video URL Resolver

Small Node.js API that takes a public Instagram Reel URL and returns a direct video URL.

It uses Playwright with a mobile browser profile, loads the Reel page, and extracts the actual media URL from the DOM or network activity.

## What It Does

- Accepts a public Instagram Reel URL
- Normalizes it to the mobile-loading `?l=1` variant
- Opens the page in a headless browser
- Extracts a reusable direct video URL
- Returns JSON for both success and failure cases

## Requirements

- Node.js 20+ recommended
- npm
- Playwright browser installed
- Google Chrome is optional but recommended as a fallback browser on macOS

## Install

```bash
npm install
npx playwright install chromium
```

## Run

```bash
npm start
```

Default server:

```text
http://localhost:3000
```

Health check:

```bash
curl http://localhost:3000/health
```

## API

### Resolve a Reel

```bash
curl 'http://localhost:3000/resolve?url=https://www.instagram.com/reel/DTVTvUDj-b1/?igsh=MXc1enZtYmsyemprcA=='
```

Successful response:

```json
{
  "inputUrl": "https://www.instagram.com/reel/DTVTvUDj-b1/?igsh=MXc1enZtYmsyemprcA==",
  "normalizedUrl": "https://www.instagram.com/reel/DTVTvUDj-b1/?l=1",
  "videoUrl": "https://scontent-....mp4",
  "method": "dom"
}
```

Error response:

```json
{
  "error": {
    "code": "EXTRACTION_FAILED",
    "message": "Direct video URL not found",
    "stage": "network_fallback"
  }
}
```

## Configuration

Environment variables:

- `PORT`: server port. Default `3000`
- `BROWSER_TIMEOUT_MS`: browser timeout in milliseconds. Default `20000`
- `HEADLESS`: `true` or `false`. Default `true`
- `DEBUG`: `true` or `false`. Default `false`
- `BROWSER_CHANNEL`: optional Playwright browser channel, for example `chrome`
- `BROWSER_EXECUTABLE_PATH`: optional full path to a browser executable

Example:

```bash
PORT=3000 DEBUG=true npm start
```

## Behavior And Limits

- Only supports public Instagram Reel URLs
- No login, cookie injection, or stealth bypassing
- Returns success only for reusable direct media URLs
- `blob:` URLs and in-page object URLs are rejected
- Instagram can change markup or anti-bot behavior at any time

## Error Codes

- `INVALID_INPUT`: missing or invalid Reel URL
- `EXTRACTION_FAILED`: page loaded but no direct media URL was found
- `UPSTREAM_BLOCKED`: Instagram blocked access or forced a login/challenge flow
- `TIMEOUT`: page load or extraction timed out
- `INTERNAL_ERROR`: unexpected resolver or browser failure

## Browser Notes

The resolver tries Playwright Chromium first. If that launch fails and no explicit browser is configured, it automatically falls back to system Chrome.

This is useful on some macOS setups where bundled Chromium can fail while Chrome works.

## Development

Run tests:

```bash
npm test
```

Project structure:

- `server.js`: process entrypoint
- `src/app.js`: Express app and route wiring
- `src/resolveReel.js`: Playwright extraction logic
- `src/url.js`: Reel URL validation and normalization
- `tests/`: route and utility tests

## Open Source Notes

If you publish this project:

- make clear that it is for public Reels only
- document that Instagram may block scraping behavior
- avoid promising long-term reliability without maintenance

## License

MIT. See `LICENSE`.
