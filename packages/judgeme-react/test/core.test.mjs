import assert from "node:assert/strict";
import test from "node:test";
import {
  createJudgeMeConfig,
  getShopifyNumericId,
  resolveJudgeMeEngine,
} from "../dist/index.js";

test("normalizes the permanent Shopify domain", () => {
  assert.deepEqual(
    createJudgeMeConfig({
      shopDomain: "https://VANILLA-SLOP.myshopify.com/products/example",
    }),
    {
      shopDomain: "vanilla-slop.myshopify.com",
      publicToken: undefined,
      defaultEngine: "auto",
    },
  );
});

test("extracts Shopify numeric IDs from GraphQL IDs", () => {
  assert.equal(getShopifyNumericId("gid://shopify/Product/12345"), "12345");
  assert.equal(getShopifyNumericId("12345"), "12345");
});

test("auto engine resolution follows exact, legacy, native order", () => {
  const runtimes = [
    { engine: "native", supports: () => true },
    { engine: "legacy", supports: () => true },
    { engine: "exact", supports: () => false },
  ];

  assert.equal(
    resolveJudgeMeEngine({
      widget: "star-rating-badge",
      runtimes,
    }),
    "legacy",
  );
});

test("an explicit engine never silently falls through", () => {
  const runtimes = [
    { engine: "legacy", supports: () => false },
    { engine: "native", supports: () => true },
  ];

  assert.equal(
    resolveJudgeMeEngine({
      widget: "trust-badge",
      preferredEngine: "legacy",
      runtimes,
    }),
    undefined,
  );
});
