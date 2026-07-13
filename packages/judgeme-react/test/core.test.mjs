import assert from "node:assert/strict";
import test from "node:test";
import {
  createJudgeMeConfig,
  fetchLegacyReviewWidget,
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

test("fetches and normalizes a complete legacy Review Widget payload", async () => {
  const requestedEndpoints = [];
  const mockFetch = async (input) => {
    const url = new URL(input);
    const endpoint = url.pathname.split("/").pop();
    requestedEndpoints.push(endpoint);

    assert.equal(url.searchParams.get("shop_domain"), "store.myshopify.com");
    assert.equal(url.searchParams.get("api_token"), "public-token");

    if (endpoint === "product_review") {
      assert.equal(url.searchParams.get("external_id"), "12345");

      return Response.json({
        product_external_id: 12345,
        widget:
          "<div class='jdgm-rev-widg'><a class='jdgm-write-rev-link' href='#'>Write a review</a></div>",
      });
    }

    if (endpoint === "settings") {
      return Response.json({
        settings:
          "<script class='jdgm-settings-script'>window.jdgmSettings={\"widget_version\":\"3.0\",\"review_widget_revamp_enabled\":true};</script><style>.jdgm-star{color:gold}</style>",
      });
    }

    if (endpoint === "html_miracle") {
      return Response.json({
        html_miracle: "<style>.jdgm-rev{display:block}</style>",
      });
    }

    return new Response(null, { status: 404 });
  };

  const data = await fetchLegacyReviewWidget({
    shopDomain: "https://STORE.myshopify.com/products/example",
    publicToken: " public-token ",
    productId: "gid://shopify/Product/12345",
    fetch: mockFetch,
  });

  assert.deepEqual(requestedEndpoints.sort(), [
    "html_miracle",
    "product_review",
    "settings",
  ]);
  assert.equal(data.productId, "12345");
  assert.match(data.html, /jdgm-rev-widg/);
  assert.match(data.styles, /jdgm-star/);
  assert.match(data.styles, /jdgm-rev/);
  assert.equal(data.settings.widget_version, "3.0");
  assert.equal(data.settings.review_widget_revamp_enabled, false);
});

test("rejects executable markup returned by the Widget API", async () => {
  const mockFetch = async (input) => {
    const endpoint = new URL(input).pathname.split("/").pop();

    if (endpoint === "product_review") {
      return Response.json({
        product_external_id: 12345,
        widget: "<div><script>alert('nope')</script></div>",
      });
    }

    if (endpoint === "settings") {
      return Response.json({
        settings:
          "<script class='jdgm-settings-script'>window.jdgmSettings={};</script>",
      });
    }

    return Response.json({ html_miracle: "" });
  };

  await assert.rejects(
    fetchLegacyReviewWidget({
      shopDomain: "store.myshopify.com",
      publicToken: "public-token",
      productId: "12345",
      fetch: mockFetch,
    }),
    /executable Review Widget markup/,
  );
});
