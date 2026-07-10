import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = ["/", "/docs", "/security", "/privacy", "/changelog", "/community", "/legal"];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const target = window as typeof window & { __nexusVitals?: { lcp: number; cls: number } };
    target.__nexusVitals = { lcp: 0, cls: 0 };
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries.at(-1);
      if (last && target.__nexusVitals) target.__nexusVitals.lcp = last.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
        if (!shift.hadRecentInput && target.__nexusVitals) target.__nexusVitals.cls += shift.value ?? 0;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
});

test("publishes every launch page with semantic landmarks", async ({ page }) => {
  for (const route of routes) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  }
});

test("explains the source-only release without a dead installer link", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Source open. Signed build pending." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Build the source beta" })).toHaveAttribute("href", "/docs#getting-started");
  await expect(page.locator('a[href$=".dmg"]')).toHaveCount(0);
});

test("has no serious automated accessibility violations", async ({ page }, testInfo) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""));
  expect(serious, `${testInfo.project.name}: ${serious.map((item) => `${item.id}: ${item.help}`).join("; ")}`).toEqual([]);
});

test("stays within local Core Web Vitals guardrails", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(1_000);
  const metrics = await page.evaluate(() => {
    const target = window as typeof window & { __nexusVitals?: { lcp: number; cls: number } };
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    return {
      lcp: target.__nexusVitals?.lcp ?? 0,
      cls: target.__nexusVitals?.cls ?? 0,
      domContentLoaded: navigation.domContentLoadedEventEnd,
    };
  });
  expect(metrics.lcp).toBeGreaterThan(0);
  expect(metrics.lcp).toBeLessThan(2_500);
  expect(metrics.cls).toBeLessThan(0.1);
  expect(metrics.domContentLoaded).toBeLessThan(2_000);
});

test("does not overflow horizontally on mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile-only layout assertion");
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
