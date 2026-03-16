import http from "node:http";
import puppeteer from "puppeteer";

const PORT = Number(process.env.PORT ?? 3100);
const POOL_SIZE = Number(process.env.POOL_SIZE ?? 3);
const PAGE_TIMEOUT = Number(process.env.PAGE_TIMEOUT ?? 30_000);
const WAIT_UNTIL = process.env.WAIT_UNTIL ?? "networkidle2";

let browser;
const pagePool = [];

async function initBrowser() {
  browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-extensions",
      "--disable-background-networking",
      "--single-process",
    ],
  });
  for (let i = 0; i < POOL_SIZE; i++) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    );
    pagePool.push({ page, busy: false });
  }
  console.log(`[puppeteer-proxy] browser launched, pool=${POOL_SIZE}`);
}

function acquirePage() {
  const slot = pagePool.find((s) => !s.busy);
  if (!slot) return null;
  slot.busy = true;
  return slot;
}

function releasePage(slot) {
  slot.busy = false;
}

async function renderUrl(targetUrl, options = {}) {
  const slot = acquirePage();
  if (!slot) {
    throw new Error("No available browser slots — pool exhausted");
  }
  try {
    const { page } = slot;
    const waitUntil = options.waitUntil ?? WAIT_UNTIL;
    const timeout = options.timeout ?? PAGE_TIMEOUT;

    await page.goto(targetUrl, { waitUntil, timeout });

    // Optional: wait for a specific selector
    if (options.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, {
        timeout: Math.min(timeout, 10_000),
      });
    }

    const html = await page.content();
    const title = await page.title();

    // Reset page for next use
    await page.goto("about:blank");

    return { html, title };
  } finally {
    releasePage(slot);
  }
}

function parseQuery(url) {
  const u = new URL(url, "http://localhost");
  return Object.fromEntries(u.searchParams);
}

const server = http.createServer(async (req, res) => {
  // Health check
  if (req.url === "/health") {
    const freeSlots = pagePool.filter((s) => !s.busy).length;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", freeSlots, totalSlots: POOL_SIZE }));
    return;
  }

  // Pool status
  if (req.url === "/status") {
    const slots = pagePool.map((s, i) => ({ id: i, busy: s.busy }));
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ slots, browserConnected: browser?.connected }));
    return;
  }

  // Render endpoint: GET /render?url=<encoded_url>[&waitFor=<selector>][&waitUntil=<event>]
  if (req.url?.startsWith("/render")) {
    const params = parseQuery(req.url);
    const targetUrl = params.url;

    if (!targetUrl) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing ?url= parameter" }));
      return;
    }

    // Validate URL to prevent SSRF — only allow http(s) and external hosts
    let parsed;
    try {
      parsed = new URL(targetUrl);
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid URL" }));
      return;
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Only http/https URLs are allowed" }));
      return;
    }

    // Block internal/private IPs to prevent SSRF
    const host = parsed.hostname;
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.startsWith("10.") ||
      host.startsWith("172.") ||
      host.startsWith("192.168.") ||
      host === "0.0.0.0" ||
      host.endsWith(".internal")
    ) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal URLs are not allowed" }));
      return;
    }

    try {
      const start = Date.now();
      const result = await renderUrl(targetUrl, {
        waitForSelector: params.waitFor,
        waitUntil: params.waitUntil,
      });
      const elapsed = Date.now() - start;

      // Return as HTML by default, JSON if ?format=json
      if (params.format === "json") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            url: targetUrl,
            title: result.title,
            html: result.html,
            renderTimeMs: elapsed,
          }),
        );
      } else {
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "X-Render-Time-Ms": String(elapsed),
          "X-Page-Title": encodeURIComponent(result.title),
        });
        res.end(result.html);
      }
    } catch (err) {
      const msg = err.message ?? "Render failed";
      const status = msg.includes("pool exhausted") ? 503 : 500;
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: msg }));
    }
    return;
  }

  // 404 for everything else
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

async function main() {
  await initBrowser();
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[puppeteer-proxy] listening on :${PORT}`);
  });
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[puppeteer-proxy] SIGTERM, shutting down...");
  server.close();
  if (browser) await browser.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[puppeteer-proxy] SIGINT, shutting down...");
  server.close();
  if (browser) await browser.close();
  process.exit(0);
});

main().catch((err) => {
  console.error("[puppeteer-proxy] Fatal:", err);
  process.exit(1);
});
