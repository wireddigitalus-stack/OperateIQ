import { test, expect } from "@playwright/test";

test.describe("PropOpsIQ Beta Readiness Smoke Suite", () => {
  test("GET /api/health returns structured status and env/db checks", async ({ request }) => {
    const res = await request.get("/api/health");
    expect([200, 503]).toContain(res.status());
    const body = await res.json();
    expect(["ok", "degraded"]).toContain(body.status);
    expect(["ok", "error"]).toContain(body.env);
    expect(["ok", "error"]).toContain(body.db);
    expect(typeof body.latencyMs).toBe("number");
  });

  test("unauthenticated API endpoints enforce 401 unauthorized", async ({ request }) => {
    const protectedEndpoints: Array<{ method: "GET" | "POST"; url: string; data?: unknown }> = [
      { method: "GET", url: "/api/tenants" },
      { method: "GET", url: "/api/rent-payments?month=2026-11" },
      { method: "GET", url: "/api/maintenance" },
      { method: "GET", url: "/api/cleaning" },
      { method: "POST", url: "/api/intake/commit", data: { tenants: [{ name: "Test", monthlyRent: 1000 }] } },
      { method: "GET", url: "/api/property-units" },
      { method: "GET", url: "/api/expenses?year=2026" },
      { method: "GET", url: "/api/tenants/portal-link?tenantId=test" },
      { method: "POST", url: "/api/rent-payments/remind", data: { month: "2026-11", mode: "bulk_unpaid" } },
      { method: "POST", url: "/api/rent-payments/apply-late-fees", data: { action: "apply_now", month: "2026-11" } },
      { method: "GET", url: "/api/cron/daily-ops" },
    ];

    for (const ep of protectedEndpoints) {
      const res =
        ep.method === "GET"
          ? await request.get(ep.url)
          : await request.post(ep.url, { data: ep.data });
      expect(res.status(), `Expected 401 for ${ep.method} ${ep.url}`).toBe(401);
    }
  });

  test("POST /api/client-error accepts structured client crash reports", async ({ request }) => {
    const res = await request.post("/api/client-error", {
      data: {
        message: "Smoke test synthetic client error",
        digest: "smoke_digest_001",
        url: "/smoke-test",
        source: "playwright-smoke",
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.errorId).toMatch(/^err_/);
  });

  test("marketing homepage, pricing, terms, and privacy pages render cleanly", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/PropOpsIQ/i);
    await expect(page.locator("body")).toContainText(/PropOpsIQ/i);

    await page.goto("/pricing");
    await expect(page.locator("body")).toContainText(/Starter/i);
    await expect(page.locator("body")).toContainText(/Growth/i);

    await page.goto("/terms");
    await expect(page.locator("h1")).toContainText(/Terms/i);

    await page.goto("/privacy");
    await expect(page.locator("h1")).toContainText(/Privacy/i);
  });

  test("signup page enforces Terms & Privacy agreement before submit", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /Run your portfolio on autopilot/i })).toBeVisible();

    const submitBtn = page.getByRole("button", { name: /Start My 14-Day Free Trial/i });
    await expect(submitBtn).toBeDisabled();

    const termsCheckbox = page.locator('input[type="checkbox"]');
    await termsCheckbox.check();
    await expect(termsCheckbox).toBeChecked();
  });

  test("unpublished tenant site shows privacy gate while live tenant site stays online", async ({ page, request }) => {
    const healthRes = await request.get("/api/health");
    const health = await healthRes.json();

    const demoRes = await page.goto("/site/operateiq-demo");
    expect(demoRes?.status()).toBeLessThan(500);

    if (health.db === "ok") {
      // Platform demo org is unpublished by default → shows private gate
      await expect(page.locator("body")).toContainText(/not published|private|unpublished|not available/i);

      // Existing live tenant WIRED DIGITAL LLC remains 100% live
      const liveRes = await page.goto("/site/wired-digital-llc");
      expect(liveRes?.status()).toBe(200);
      await expect(page.locator("body")).toContainText(/WIRED DIGITAL/i);
    } else {
      // Offline / placeholder-env CI: renders custom 404 screen cleanly without crashing
      expect(demoRes?.status()).toBe(404);
    }
  });

  test("crew maintenance PIN portal renders org-code + 6-digit keypad and rejects invalid PIN", async ({ page, request }) => {
    await page.goto("/staff/maintenance?org=operateiq-demo");
    await expect(page.getByRole("heading", { name: /Maintenance Portal/i })).toBeVisible();
    await expect(page.locator("body")).toContainText(/Enter your 6-digit PIN/i);

    // Direct API check that invalid 6-digit PIN is rejected with 401/400/429
    const pinRes = await request.post("/api/verify-pin", {
      data: { pin: "987654", role: "maintenance", orgCode: "operateiq-demo" },
    });
    expect([400, 401, 404, 429]).toContain(pinRes.status());
  });

  test("Resident Portal rejects forged/tampered HMAC tokens cleanly with noindex", async ({ page, request }) => {
    const forgedToken = "tp1.eyJvcmdJZCI6IjAwMCIsInRlbmFudElkIjoiMTExIiwidjoxfQ.forgedsignature";

    const apiRes = await request.get(`/api/portal/${forgedToken}`);
    expect([403, 404]).toContain(apiRes.status());

    const postRes = await request.post(`/api/portal/${forgedToken}`, {
      data: { action: "maintenance_request", description: "Leaky faucet" },
    });
    expect([403, 404]).toContain(postRes.status());

    await page.goto(`/portal/${forgedToken}`);
    await expect(page.locator("body")).toContainText(/Portal Link Unavailable|invalid|expired/i);
    const robotsMeta = await page.locator('meta[name="robots"]').getAttribute("content");
    expect(robotsMeta || "").toContain("noindex");
    // Ensure marketing WebGL canvas is never mounted on resident portal
    await expect(page.locator("canvas")).toHaveCount(0);
  });

  test("public site-content endpoint strips private landlord ledger & token sections", async ({ request }) => {
    const res = await request.get("/api/site-content?org_slug=wired-digital-llc");
    expect(res.status()).toBeLessThan(500);
    if (res.status() === 200) {
      const data = await res.json();
      const items: Array<{ section?: string }> = Array.isArray(data.items) ? data.items : [];
      const forbidden = new Set(["rent_ledger", "portal_tokens", "property_units_v1", "expenses_ledger"]);
      for (const it of items) {
        expect(forbidden.has(String(it.section || "").toLowerCase())).toBe(false);
      }
    }
  });
});
