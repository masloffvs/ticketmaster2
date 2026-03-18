import http from "node:http";
import puppeteer from "puppeteer";

const PORT = Number(process.env.PORT ?? 3100);
const POOL_SIZE = Number(process.env.POOL_SIZE ?? 3);
const PAGE_TIMEOUT = Number(process.env.PAGE_TIMEOUT ?? 30_000);
const WAIT_UNTIL = process.env.WAIT_UNTIL ?? "networkidle2";

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

let browser;
const pagePool = [];

// ── Dedicated API page for TM cookie-dependent requests ──────
let apiPage = null;
let apiPageReady = false;
let apiPageLock = Promise.resolve();

// ── US ISMDS API page (services.ticketmaster.com via www.ticketmaster.com) ──
let usApiPage = null;
let usApiPageReady = false;
let usApiPageLock = Promise.resolve();

async function ensureApiPage() {
  if (apiPage && !apiPage.isClosed() && apiPageReady) return apiPage;

  if (apiPage && !apiPage.isClosed()) await apiPage.close().catch(() => {});
  apiPage = await browser.newPage();
  await apiPage.setViewport({ width: 1280, height: 900 });
  await apiPage.setUserAgent(UA);

  // Navigate to TM to establish PerimeterX / session cookies
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await apiPage.goto("https://www.ticketmaster.se/", {
        waitUntil: "networkidle2",
        timeout: PAGE_TIMEOUT,
      });
      break;
    } catch (err) {
      const msg = err.message ?? "";
      if (
        msg.includes("Execution context was destroyed") ||
        msg.includes("frame was detached") ||
        msg.includes("navigation")
      ) {
        console.log(
          `[puppeteer-proxy] api-page warm-up bounce attempt=${attempt + 1}`,
        );
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      throw err;
    }
  }

  apiPageReady = true;
  console.log("[puppeteer-proxy] API page warmed on ticketmaster.se");
  return apiPage;
}

async function ensureUsApiPage() {
  if (usApiPage && !usApiPage.isClosed() && usApiPageReady) return usApiPage;

  if (usApiPage && !usApiPage.isClosed())
    await usApiPage.close().catch(() => {});
  usApiPage = await browser.newPage();
  await usApiPage.setViewport({ width: 1280, height: 900 });
  await usApiPage.setUserAgent(UA);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await usApiPage.goto("https://www.ticketmaster.com/", {
        waitUntil: "networkidle2",
        timeout: PAGE_TIMEOUT,
      });
      break;
    } catch (err) {
      const msg = err.message ?? "";
      if (
        msg.includes("Execution context was destroyed") ||
        msg.includes("frame was detached") ||
        msg.includes("navigation")
      ) {
        console.log(
          `[puppeteer-proxy] us-api-page warm-up bounce attempt=${attempt + 1}`,
        );
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      throw err;
    }
  }

  usApiPageReady = true;
  console.log("[puppeteer-proxy] US API page warmed on ticketmaster.com");
  return usApiPage;
}

async function fetchIsmds(eventId, endpoint, queryString) {
  const prev = usApiPageLock;
  let unlock;
  usApiPageLock = new Promise((r) => {
    unlock = r;
  });
  await prev;

  try {
    const page = await ensureUsApiPage();

    // Default query strings per endpoint (TM ISMDS API)
    const DEFAULT_QS = {
      facets:
        "q=available&by=inventorytypes%20offertypes%20area%20tickettype%20priceLevels&show=listpricerange&resaleChannelId=internal.ecommerce.consumer.desktop.web.browser.ticketmaster.us&apikey=b462oi7fic6pehcdkzony5bxhe&apisecret=pquzpfrfz7zd2ylvtz3w5dtyse&embed=area&embed=tickettype",
      quickpicks:
        "show=places+maxQuantity+sections&mode=primary:ppsectionrow+resale:ga_areas+platinum:all&qty=2&q=not(%27accessible%27)&includeStandard=true&includeResale=false&includePlatinumInventoryType=false&ticketTypes=000000000001%2C218100000007&embed=area&embed=offer&embed=description&apikey=b462oi7fic6pehcdkzony5bxhe&apisecret=pquzpfrfz7zd2ylvtz3w5dtyse&requireSeatsResale=true&resaleChannelId=internal.ecommerce.consumer.desktop.web.browser.ticketmaster.us&limit=40&offset=0&sort=noTaxTotalprice",
    };

    const qs = queryString || DEFAULT_QS[endpoint] || "";
    const apiUrl = `https://services.ticketmaster.com/api/ismds/event/${eventId}/${endpoint}?${qs}`;
    console.log(`[puppeteer-proxy] ISMDS fetch: ${endpoint} for ${eventId}`);

    const result = await page.evaluate(async (url) => {
      try {
        const r = await fetch(url, {
          credentials: "include",
          cache: "no-store",
        });
        return { status: r.status, body: await r.text() };
      } catch (e) {
        return { status: 502, body: JSON.stringify({ error: e.message }) };
      }
    }, apiUrl);

    // If blocked, reset the page so next call re-warms
    if (result.body.includes('"response":"block"')) {
      console.log("[puppeteer-proxy] ISMDS blocked, resetting US API page");
      usApiPageReady = false;
    }

    return result;
  } finally {
    unlock();
  }
}

async function fetchTmApi(apiUrl, eventId) {
  // Serialize access to the shared API page
  const prev = apiPageLock;
  let unlock;
  apiPageLock = new Promise((r) => {
    unlock = r;
  });
  await prev;

  try {
    const page = await ensureApiPage();

    // Intercept the availability API response by navigating to the event page
    // TM's own JS will call the availability API with proper cookies/tokens
    let intercepted = null;

    const responseHandler = (response) => {
      const url = response.url();
      if (
        url.includes(`availability.ticketmaster.se`) &&
        url.includes(eventId)
      ) {
        response
          .text()
          .then((body) => {
            intercepted = { status: response.status(), body };
          })
          .catch(() => {});
      }
    };

    page.on("response", responseHandler);

    try {
      // Navigate to the event page — TM's JS will fetch availability
      const eventUrl = `https://www.ticketmaster.se/event/-/${eventId}`;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (attempt === 0) {
            await page.goto(eventUrl, {
              waitUntil: "networkidle2",
              timeout: PAGE_TIMEOUT,
            });
          } else {
            await page
              .waitForNavigation({
                waitUntil: "networkidle2",
                timeout: PAGE_TIMEOUT,
              })
              .catch(() => {});
            await new Promise((r) => setTimeout(r, 2000));
          }
          break;
        } catch (err) {
          const msg = err.message ?? "";
          if (
            msg.includes("Execution context was destroyed") ||
            msg.includes("frame was detached") ||
            msg.includes("navigation")
          ) {
            console.log(
              `[puppeteer-proxy] availability nav bounce attempt=${attempt + 1}`,
            );
            continue;
          }
          throw err;
        }
      }

      // Wait a bit more for async API calls to complete
      if (!intercepted) {
        await new Promise((r) => setTimeout(r, 3000));
      }

      if (intercepted) {
        console.log(
          `[puppeteer-proxy] intercepted availability for ${eventId}: ${intercepted.status}`,
        );
        return intercepted;
      }

      // Fallback: try fetching from the browser context directly
      console.log(
        `[puppeteer-proxy] no intercept, trying browser fetch for ${eventId}`,
      );
      const result = await page.evaluate(async (eid) => {
        try {
          const r = await fetch(
            `https://availability.ticketmaster.se/api/v2/TM_SE/availability/${eid}?subChannelId=1`,
            { credentials: "include", cache: "no-store" },
          );
          return { status: r.status, body: await r.text() };
        } catch (e) {
          return { status: 502, body: JSON.stringify({ error: e.message }) };
        }
      }, eventId);

      return result;
    } finally {
      page.off("response", responseHandler);
      // Reset API page readiness — next call will need fresh navigation
      apiPageReady = false;
    }
  } finally {
    unlock();
  }
}

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
    await page.setUserAgent(UA);
    pagePool.push({ page, busy: false });
  }
  console.log(`[puppeteer-proxy] browser launched, pool=${POOL_SIZE}`);

  // Pre-warm the API pages in background
  ensureApiPage().catch((err) =>
    console.error("[puppeteer-proxy] API page warm-up failed:", err.message),
  );
  ensureUsApiPage().catch((err) =>
    console.error("[puppeteer-proxy] US API page warm-up failed:", err.message),
  );
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

    // Some sites (e.g. TM with PerimeterX) trigger client-side redirects
    // that destroy the execution context. We handle this with retries.
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt === 0) {
          await page.goto(targetUrl, { waitUntil, timeout });
        } else {
          // After a redirect/navigation, just wait for the page to settle
          await page.waitForNavigation({ waitUntil, timeout }).catch(() => {});
          // Give extra time for JS frameworks to render
          await new Promise((r) => setTimeout(r, 2000));
        }
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        const msg = err.message ?? "";
        if (
          msg.includes("Execution context was destroyed") ||
          msg.includes("frame was detached") ||
          msg.includes("navigation")
        ) {
          console.log(
            `[puppeteer-proxy] navigation bounce attempt=${attempt + 1} url=${targetUrl}`,
          );
          continue;
        }
        throw err;
      }
    }
    if (lastError) throw lastError;

    // Wait a bit for any remaining async rendering
    await new Promise((r) => setTimeout(r, 1000));

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

  // TM Availability API (cookie-dependent)
  // GET /availability?eventId=887356630
  if (req.url?.startsWith("/availability")) {
    const params = parseQuery(req.url);
    const eventId = params.eventId;

    if (!eventId || !/^\d+$/.test(eventId)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ error: "Missing or invalid ?eventId= parameter" }),
      );
      return;
    }

    try {
      const start = Date.now();
      const result = await fetchTmApi(null, eventId);
      const elapsed = Date.now() - start;

      res.writeHead(result.status || 502, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "X-Fetch-Time-Ms": String(elapsed),
      });
      res.end(result.body);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // TM ISMDS API (cookie-dependent: facets, quickpicks)
  // GET /ismds?eventId=17006384E69D82F8&endpoint=facets&qs=<url-encoded-query-string>
  if (req.url?.startsWith("/ismds")) {
    const params = parseQuery(req.url);
    const eventId = params.eventId;
    const endpoint = params.endpoint;

    if (!eventId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing ?eventId= parameter" }));
      return;
    }

    const ALLOWED_ENDPOINTS = ["facets", "quickpicks"];
    if (!endpoint || !ALLOWED_ENDPOINTS.includes(endpoint)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: `endpoint must be one of: ${ALLOWED_ENDPOINTS.join(", ")}`,
        }),
      );
      return;
    }

    const queryString = params.qs || "";

    try {
      const start = Date.now();
      const result = await fetchIsmds(eventId, endpoint, queryString);
      const elapsed = Date.now() - start;

      res.writeHead(result.status || 502, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "X-Fetch-Time-Ms": String(elapsed),
      });
      res.end(result.body);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
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
