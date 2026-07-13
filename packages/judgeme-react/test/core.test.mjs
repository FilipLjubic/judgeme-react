import assert from "node:assert/strict";
import test from "node:test";
import {
  createJudgeMeConfig,
  fetchAllReviewsCounter,
  fetchAllReviewsWidget,
  fetchFloatingReviewsTab,
  fetchLegacyProductWidgets,
  fetchLegacyReviewWidget,
  fetchLegacyStorefrontWidgets,
  fetchReviewsCarousel,
  fetchStarRatingBadge,
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
          '<script class=\'jdgm-settings-script\'>window.jdgmSettings={"widget_version":"3.0","review_widget_revamp_enabled":true};</script><style>.jdgm-star{color:gold}</style>',
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

test("fetches both product widgets with one shared resource request pair", async () => {
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
        widget: "<div class='jdgm-rev-widg'>Reviews</div>",
      });
    }

    if (endpoint === "preview_badge") {
      assert.equal(url.searchParams.get("external_id"), "12345");
      return Response.json({
        product_external_id: 12345,
        badge:
          "<div class='jdgm-prev-badge' data-average-rating='4.78' data-number-of-reviews='837'>Five stars</div>",
      });
    }

    if (endpoint === "settings") {
      return Response.json({
        settings:
          '<script class=\'jdgm-settings-script\'>window.jdgmSettings={"widget_version":"3.0","review_widget_revamp_enabled":true};</script><style>.jdgm-star{color:teal}</style>',
      });
    }

    return Response.json({
      html_miracle: "<style>.jdgm-prev-badge{display:block}</style>",
    });
  };

  const data = await fetchLegacyProductWidgets({
    shopDomain: "store.myshopify.com",
    publicToken: "public-token",
    productId: "gid://shopify/Product/12345",
    fetch: mockFetch,
  });

  assert.deepEqual(requestedEndpoints.sort(), [
    "html_miracle",
    "preview_badge",
    "product_review",
    "settings",
  ]);
  assert.equal(data.reviewWidget.productId, "12345");
  assert.match(data.reviewWidget.html, /jdgm-rev-widg/);
  assert.equal(data.starRatingBadge.productId, "12345");
  assert.match(data.starRatingBadge.html, /data-average-rating='4.78'/);
  assert.match(data.resources.styles, /color:teal/);
  assert.match(data.resources.styles, /jdgm-prev-badge/);
  assert.equal(data.resources.settings.review_widget_revamp_enabled, false);
});

test("fetches a standalone Star Rating Badge payload", async () => {
  const requestedEndpoints = [];
  const mockFetch = async (input) => {
    const endpoint = new URL(input).pathname.split("/").pop();
    requestedEndpoints.push(endpoint);

    if (endpoint === "preview_badge") {
      return Response.json({
        product_external_id: 12345,
        badge:
          "<div class='jdgm-prev-badge' data-number-of-reviews='837'>Five stars</div>",
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

  const data = await fetchStarRatingBadge({
    shopDomain: "store.myshopify.com",
    publicToken: "public-token",
    productId: "12345",
    fetch: mockFetch,
  });

  assert.deepEqual(requestedEndpoints.sort(), [
    "html_miracle",
    "preview_badge",
    "settings",
  ]);
  assert.equal(data.productId, "12345");
  assert.match(data.html, /jdgm-prev-badge/);
});

test("fetches a standalone classic Reviews Carousel payload", async () => {
  const requestedEndpoints = [];
  const mockFetch = async (input) => {
    const url = new URL(input);
    const endpoint = url.pathname.split("/").pop();
    requestedEndpoints.push(endpoint);

    assert.equal(url.searchParams.get("shop_domain"), "store.myshopify.com");
    assert.equal(url.searchParams.get("api_token"), "public-token");
    assert.equal(url.searchParams.has("external_id"), false);

    if (endpoint === "featured_carousel") {
      return Response.json({
        featured_carousel:
          "<section class='jdgm-widget jdgm-carousel'><article class='jdgm-carousel-item'>A review</article></section>",
      });
    }

    if (endpoint === "settings") {
      return Response.json({
        settings:
          '<script class=\'jdgm-settings-script\'>window.jdgmSettings={"featured_carousel_theme":"default"};</script><style>.jdgm-carousel{color:teal}</style>',
      });
    }

    return Response.json({ html_miracle: "" });
  };

  const data = await fetchReviewsCarousel({
    shopDomain: "store.myshopify.com",
    publicToken: "public-token",
    fetch: mockFetch,
  });

  assert.deepEqual(requestedEndpoints.sort(), [
    "featured_carousel",
    "html_miracle",
    "settings",
  ]);
  assert.match(data.html, /jdgm-carousel-item/);
  assert.match(data.styles, /color:teal/);
  assert.equal(data.settings.featured_carousel_theme, "default");
});

test("fetches a standalone All Reviews Counter with dashboard text", async () => {
  const requestedEndpoints = [];
  const mockFetch = async (input) => {
    const url = new URL(input);
    const endpoint = url.pathname.split("/").pop();
    requestedEndpoints.push(endpoint);

    assert.equal(url.searchParams.get("shop_domain"), "store.myshopify.com");
    assert.equal(url.searchParams.get("api_token"), "public-token");
    assert.equal(url.searchParams.has("external_id"), false);

    if (endpoint === "all_reviews_count") {
      return Response.json({ all_reviews_count: 42 });
    }

    if (endpoint === "all_reviews_rating") {
      return Response.json({ all_reviews_rating: "4.64" });
    }

    if (endpoint === "settings") {
      return Response.json({
        settings:
          '<script class=\'jdgm-settings-script\'>window.jdgmSettings={"all_reviews_text_style":"branded","all_reviews_text_badge_text_branded_style":"{{ shop.metafields.judgeme.all_reviews_rating | round: 1 }} out of 5 stars based on {{ shop.metafields.judgeme.all_reviews_count }} reviews","is_all_reviews_text_badge_a_link":true,"all_reviews_text_badge_url":"javascript:alert(1)"};</script><style>.jdgm-all-reviews-text{color:teal}</style>',
      });
    }

    return Response.json({ html_miracle: "" });
  };

  const data = await fetchAllReviewsCounter({
    shopDomain: "store.myshopify.com",
    publicToken: "public-token",
    fetch: mockFetch,
  });

  assert.deepEqual(requestedEndpoints.sort(), [
    "all_reviews_count",
    "all_reviews_rating",
    "html_miracle",
    "settings",
  ]);
  assert.equal(data.count, 42);
  assert.equal(data.rating, "4.64");
  assert.match(data.html, /jdgm-all-reviews-text--style-branded/);
  assert.match(data.html, /data-score="4.64"/);
  assert.match(data.html, /data-number-of-reviews="42"/);
  assert.match(data.html, /4.6 out of 5 stars based on 42 reviews/);
  assert.doesNotMatch(data.html, /javascript:/);
  assert.match(data.styles, /color:teal/);
});

test("fetches the configured legacy All Reviews Widget", async () => {
  const requestedEndpoints = [];
  const mockFetch = async (input) => {
    const url = new URL(input);
    const endpoint = url.pathname.split("/").pop();
    requestedEndpoints.push(endpoint);

    if (endpoint === "all_reviews_page") {
      assert.equal(url.searchParams.get("review_type"), "shop-reviews");
      assert.equal(url.searchParams.get("page"), "1");
      return Response.json({
        all_reviews:
          "<article class='jdgm-rev' data-review-id='store-review'>A store review</article>",
        all_reviews_header:
          "<div class='jdgm-all-reviews__header' data-number-of-reviews='12' data-average-rating='4.75' data-number-of-product-reviews='9' data-number-of-shop-reviews='3' data-per-page='10'><div class='jdgm-rev-widg__sort-wrapper'></div></div>",
      });
    }

    if (endpoint === "settings") {
      return Response.json({
        settings:
          '<script class=\'jdgm-settings-script\'>window.jdgmSettings={"widget_first_sub_tab":"shop-reviews","widget_product_reviews_subtab_text":"Product feedback","widget_shop_reviews_subtab_text":"Store feedback","all_reviews_page_load_reviews_on":"scroll"};</script><style>.jdgm-all-reviews-widget{color:teal}</style>',
      });
    }

    return Response.json({ html_miracle: "" });
  };

  const data = await fetchAllReviewsWidget({
    shopDomain: "store.myshopify.com",
    publicToken: "public-token",
    fetch: mockFetch,
  });

  assert.deepEqual(requestedEndpoints.sort(), [
    "all_reviews_page",
    "html_miracle",
    "settings",
  ]);
  assert.equal(data.initialReviewType, "shop-reviews");
  assert.match(data.html, /jdgm-all-reviews-widget/);
  assert.match(data.html, /data-load-mode="scroll"/);
  assert.match(data.html, /data-all-reviews-loaded="false"/);
  assert.match(data.html, /data-page-size="1"/);
  assert.match(data.html, /role="button" tabindex="0"/);
  assert.match(data.html, /Product feedback/);
  assert.match(data.html, /Store feedback/);
  assert.match(data.html, /A store review/);
  assert.match(data.styles, /color:teal/);
});

test("fetches an exact Floating Reviews Tab when Judge.me provides one", async () => {
  const requestedEndpoints = [];
  const mockFetch = async (input) => {
    const url = new URL(input);
    const endpoint = url.pathname.split("/").pop();
    requestedEndpoints.push(endpoint);

    if (endpoint === "reviews_tab") {
      assert.equal(url.searchParams.get("page"), "1");
      assert.equal(url.searchParams.get("per_page"), "5");
      return Response.json({
        page: 1,
        reviews_tab: {
          html: "<section class='jdgm-widget jdgm-revs-tab'><div class='jdgm-revs-tab-btn'>Reviews</div><section class='jdgm-revs-tab__wrapper'></section></section>",
        },
      });
    }

    if (endpoint === "settings") {
      return Response.json({
        settings:
          '<script class=\'jdgm-settings-script\'>window.jdgmSettings={"floating_tab_button_name":"Reviews"};</script>',
      });
    }

    return Response.json({ html_miracle: "" });
  };

  const data = await fetchFloatingReviewsTab({
    shopDomain: "store.myshopify.com",
    publicToken: "public-token",
    fetch: mockFetch,
  });

  assert.deepEqual(requestedEndpoints.sort(), [
    "html_miracle",
    "reviews_tab",
    "settings",
  ]);
  assert.equal(data.source, "reviews-tab");
  assert.match(data.html, /jdgm-revs-tab-btn/);
});

test("builds a Free-plan Floating Reviews Tab from All Reviews data", async () => {
  const requestedEndpoints = [];
  const mockFetch = async (input) => {
    const url = new URL(input);
    const endpoint = url.pathname.split("/").pop();
    requestedEndpoints.push(endpoint);

    if (endpoint === "reviews_tab") {
      return Response.json({ page: 1, reviews_tab: null });
    }

    if (endpoint === "all_reviews_page") {
      assert.equal(url.searchParams.get("review_type"), "shop-reviews");
      return Response.json({
        all_reviews:
          "<article class='jdgm-rev' data-review-id='example'>A store review</article>",
        all_reviews_header:
          "<div class='jdgm-all-reviews__header' data-number-of-reviews='12' data-average-rating='4.75' data-number-of-product-reviews='9' data-number-of-shop-reviews='3'></div>",
      });
    }

    if (endpoint === "settings") {
      return Response.json({
        settings:
          '<script class=\'jdgm-settings-script\'>window.jdgmSettings={"widget_first_sub_tab":"shop-reviews","floating_tab_button_name":"Our feedback","floating_tab_title":"What customers say","all_reviews_page_load_more_text":"More feedback"};</script><style>.jdgm-revs-tab{color:teal}</style>',
      });
    }

    return Response.json({ html_miracle: "" });
  };

  const data = await fetchFloatingReviewsTab({
    shopDomain: "store.myshopify.com",
    publicToken: "public-token",
    fetch: mockFetch,
  });

  assert.deepEqual(requestedEndpoints.sort(), [
    "all_reviews_page",
    "html_miracle",
    "reviews_tab",
    "settings",
  ]);
  assert.equal(data.source, "all-reviews-page-fallback");
  assert.match(data.html, /data-number-of-product-reviews="9"/);
  assert.match(data.html, /data-tabname="shop-reviews"/);
  assert.match(data.html, /Our feedback/);
  assert.match(data.html, /What customers say/);
  assert.match(data.html, /More feedback/);
  assert.match(data.html, /A store review/);
  assert.match(data.styles, /color:teal/);
});

test("fetches all implemented storefront widgets with shared resources", async () => {
  const requestedEndpoints = [];
  const mockFetch = async (input) => {
    const url = new URL(input);
    const endpoint = url.pathname.split("/").pop();
    requestedEndpoints.push(endpoint);

    if (endpoint === "product_review") {
      return Response.json({
        product_external_id: 12345,
        widget: "<div class='jdgm-rev-widg'>Reviews</div>",
      });
    }

    if (endpoint === "preview_badge") {
      return Response.json({
        product_external_id: 12345,
        badge: "<div class='jdgm-prev-badge'>Five stars</div>",
      });
    }

    if (endpoint === "featured_carousel") {
      assert.equal(url.searchParams.has("external_id"), false);
      return Response.json({
        featured_carousel:
          "<section class='jdgm-widget jdgm-carousel'>Featured reviews</section>",
      });
    }

    if (endpoint === "reviews_tab") {
      assert.equal(url.searchParams.has("external_id"), false);
      return Response.json({ page: 1, reviews_tab: null });
    }

    if (endpoint === "all_reviews_page") {
      assert.equal(url.searchParams.has("external_id"), false);
      return Response.json({
        all_reviews:
          "<article class='jdgm-rev' data-review-id='shared'>Shared review</article>",
        all_reviews_header:
          "<div class='jdgm-all-reviews__header' data-number-of-reviews='12' data-average-rating='4.75' data-number-of-product-reviews='9' data-number-of-shop-reviews='3' data-per-page='10'></div>",
      });
    }

    if (endpoint === "settings") {
      return Response.json({
        settings:
          "<script class='jdgm-settings-script'>window.jdgmSettings={};</script><style>.jdgm-widget{color:teal}</style>",
      });
    }

    return Response.json({ html_miracle: "" });
  };

  const data = await fetchLegacyStorefrontWidgets({
    shopDomain: "store.myshopify.com",
    publicToken: "public-token",
    productId: "gid://shopify/Product/12345",
    fetch: mockFetch,
  });

  assert.deepEqual(requestedEndpoints.sort(), [
    "all_reviews_page",
    "featured_carousel",
    "html_miracle",
    "preview_badge",
    "product_review",
    "reviews_tab",
    "settings",
  ]);
  assert.equal(data.reviewWidget.productId, "12345");
  assert.equal(data.starRatingBadge.productId, "12345");
  assert.equal(data.allReviewsCounter.count, 12);
  assert.equal(data.allReviewsCounter.rating, "4.75");
  assert.match(
    data.allReviewsCounter.html,
    /4.8 out of 5 stars based on 12 reviews/,
  );
  assert.match(data.reviewsCarousel.html, /Featured reviews/);
  assert.equal(data.allReviewsWidget.initialReviewType, "product-reviews");
  assert.match(data.allReviewsWidget.html, /jdgm-all-reviews-widget/);
  assert.equal(data.floatingReviewsTab.source, "all-reviews-page-fallback");
  assert.match(data.floatingReviewsTab.html, /Shared review/);
  assert.equal(
    requestedEndpoints.filter((endpoint) => endpoint === "all_reviews_page")
      .length,
    1,
  );
  assert.match(data.resources.styles, /color:teal/);
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
