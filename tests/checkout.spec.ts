import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { BoxGeometry, Mesh } from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
const stl = Buffer.from(
  new STLExporter().parse(new Mesh(new BoxGeometry(20, 20, 10)), {
    binary: true,
  }).buffer,
);
test("viewer checkout, delivery and manual payment persist across reload", async ({
  page,
  browser,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Get print quote / My orders" })
    .click();
  await expect(
    page.getByText("Local demo · no real payments or delivery"),
  ).toBeVisible();
  // The viewer deliberately keeps its controls collapsed; upload via the file input.
  await page.locator("input[type=file]").first().setInputFiles({
    name: "sample.stl",
    mimeType: "application/octet-stream",
    buffer: stl,
  });
  await page
    .getByRole("button", { name: "Estimate price", exact: true })
    .click();
  await expect(
    page.getByText("Estimated total", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "front", exact: true }).click();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "changed.stl",
      mimeType: "application/octet-stream",
      buffer: stl,
    });
  await expect(page.getByText("Estimated total", { exact: false })).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: "Estimate price", exact: true })
    .click();
  await expect(
    page.getByText("Estimated total", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Quantity", { exact: true }).fill("2");
  await expect(page.getByText("Estimated total", { exact: false })).toHaveCount(
    0,
  );
  await page
    .getByRole("combobox", { name: "Fulfilment", exact: true })
    .selectOption("delivery");
  await page
    .getByRole("button", { name: "Estimate price", exact: true })
    .click();
  await page.getByLabel("Name", { exact: true }).fill("Demo Customer");
  await page.getByLabel("Email", { exact: true }).fill("customer@example.test");
  await page.getByLabel("Phone", { exact: true }).fill("81234567");
  await page
    .getByLabel("Delivery address", { exact: true })
    .fill("Demo Street 1");
  await page.getByLabel("Singapore postal code").fill("123456");
  await page.getByRole("button", { name: "Request confirmed quote" }).click();
  await expect(
    page.getByText("Awaiting owner slicing and quote confirmation"),
  ).toBeVisible();
  const orderText = await page
    .getByRole("heading", { name: /Order SG-/ })
    .textContent();
  const orderId = orderText!.replace("Order ", "");
  await expect(page.locator('[aria-label="Print checkout"]')).not.toContainText(
    "margin",
  );
  await page.screenshot({
    path: `test-results/${info.project.name}-quote.png`,
    fullPage: true,
  });
  const ownerContext = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    owner = await ownerContext.newPage();
  const credentials = JSON.parse(readFileSync(".emulator-seed.json", "utf8"));
  await owner.goto("/owner");
  await owner.getByLabel("Email", { exact: true }).fill(credentials.email);
  await owner.getByLabel("Password").fill(credentials.password);
  await owner.getByRole("button", { name: "Sign in", exact: true }).click();
  const card = owner.locator("section").filter({
    has: owner.getByRole("heading", { name: orderId, exact: true }),
  });
  await card.getByLabel("Whole batch printing hours").fill("2");
  await card.getByLabel("Whole batch grams").fill("60");
  await card.getByLabel(/I inspected the model/).check();
  await card.getByRole("button", { name: "Confirm sliced quote" }).click();
  await owner
    .getByRole("combobox", { name: "GST declaration" })
    .selectOption("unknown");
  await owner
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(
    owner.getByText("Settings saved. Existing accepted prices are unchanged."),
  ).toBeVisible();
  await page.getByRole("button", { name: /Accept quote/ }).click();
  await expect(
    page.getByText("Payment setup is incomplete. Contact the owner."),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/${info.project.name}-missing-setup.png`,
    fullPage: true,
  });
  await owner
    .getByRole("combobox", { name: "GST declaration" })
    .selectOption("non-gst");
  await owner
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(
    owner.getByRole("button", { name: "Save settings", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: /Accept quote/ }).click();
  await expect(page.getByText("LOCAL DEMO — do not send money")).toBeVisible();
  await page
    .getByRole("button", { name: "I've paid — request verification" })
    .click();
  await expect(
    page.getByText("Awaiting verification", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Get print quote / My orders" })
    .click();
  await expect(
    page.getByText("Awaiting verification", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/${info.project.name}-verification.png`,
    fullPage: true,
  });
  await card
    .getByLabel("Bank transaction reference")
    .fill("BROWSER-" + crypto.randomUUID());
  await card.getByRole("button", { name: "Verify received payment" }).click();
  await expect(page.getByText("Paid · not_started")).toBeVisible();
  await card.getByRole("button", { name: "Mark printing" }).click();
  await expect(page.getByText("Paid · printing")).toBeVisible();
  await card.getByLabel("Actual handling minutes").fill("30");
  await card.getByLabel("Additional reprint expense").fill("5");
  await card.getByLabel("Actual courier expense").fill("7");
  await card.getByLabel("Measured energy kWh").fill("0.8");
  await card.getByRole("button", { name: "Save actual costs" }).click();
  await expect(
    card.getByText("Partial recorded profit:", { exact: false }),
  ).toBeVisible();
  await owner.reload();
  await expect(card.getByLabel("Actual handling minutes")).toHaveValue("30");
  await expect(card.getByLabel("Additional reprint expense")).toHaveValue("5");
  await expect(card.getByLabel("Actual courier expense")).toHaveValue("7");
  await expect(card.getByLabel("Measured energy kWh")).toHaveValue("0.8");
  expect(errors).toEqual([]);
  await ownerContext.close();
});
