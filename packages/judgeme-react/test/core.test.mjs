import assert from "node:assert/strict";
import test from "node:test";
import {
  createAiReviewsSummaryData,
  createPopupReviewsData,
  createQuestionsAndAnswersData,
  createReviewSnippetsData,
  createJudgeMeConfig,
  fetchCardsCarousel,
  fetchCardsCarouselPage,
  fetchAllReviewsCounter,
  fetchAllReviewsWidget,
  fetchFloatingReviewsTab,
  fetchLegacyProductWidgets,
  fetchLegacyReviewWidget,
  fetchLegacyStorefrontWidgets,
  fetchAiReviewsSummaryStatus,
  fetchPopupReviewsPage,
  fetchQuestionsAndAnswersPage,
  fetchReviewSnippetsPage,
  fetchReviewsCarousel,
  fetchReviewsGrid,
  fetchStarRatingBadge,
  fetchTestimonialsCarousel,
  fetchTestimonialsCarouselPage,
  fetchVerifiedReviewsCounter,
  fetchVideosCarousel,
  fetchVideosCarouselPage,
  getShopifyNumericId,
  normalizeTestimonialsCarouselConfig,
  normalizeAiReviewsSummaryConfig,
  normalizePopupReviewsConfig,
  normalizeQuestionsAndAnswersConfig,
  normalizeReviewSnippetsConfig,
  normalizeVideosCarouselConfig,
  parseAiReviewsSummaryMetafield,
  resolveJudgeMeEngine,
  submitQuestion,
} from "../dist/index.js";

test("normalizes the permanent Shopify domain", () => {
  assert.deepEqual(
    createJudgeMeConfig({
      shopDomain: "https://VANILLA-SLOP.myshopify.com/products/example",
    }),
    {
      shopDomain: "vanilla-slop.myshopify.com",
      publicToken: undefined,
      v3AssetBaseUrl: undefined,
      defaultEngine: "auto",
    },
  );
});

test("normalizes an official Shopify extension asset base", () => {
  assert.equal(
    createJudgeMeConfig({
      shopDomain: "store.myshopify.com",
      v3AssetBaseUrl:
        "https://cdn.shopify.com/extensions/deployment/judgeme-624/assets",
    }).v3AssetBaseUrl,
    "https://cdn.shopify.com/extensions/deployment/judgeme-624/assets/",
  );

  assert.throws(
    () =>
      createJudgeMeConfig({
        shopDomain: "store.myshopify.com",
        v3AssetBaseUrl: "https://example.com/extensions/a/judgeme/assets/",
      }),
    /official cdn\.shopify\.com/,
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

test("fetches the exact eligible Verified Reviews Counter", async () => {
  const requestedEndpoints = [];
  const mockFetch = async (input) => {
    const url = new URL(input);
    const endpoint = url.pathname.split("/").pop();
    requestedEndpoints.push(endpoint);

    assert.equal(url.searchParams.get("shop_domain"), "store.myshopify.com");
    assert.equal(url.searchParams.get("api_token"), "public-token");
    assert.equal(url.searchParams.has("external_id"), false);

    if (endpoint === "verified_badge") {
      return Response.json({
        verified_badge:
          '<div class="jdgm-widget jdgm-verified-badge"><style>.jdgm-verified-badge{display:none}</style><div class="jdgm-verified-badge__wrapper"><div class="jdgm-verified-badge__image" data-url="/badge.png"></div><div class="jdgm-verified-badge__total">866</div><div class="jdgm-verified-badge__text">Verified Reviews</div><div class="jdgm-verified-badge__stars"><span class="jdgm-star jdgm--on"></span></div></div></div>',
      });
    }

    if (endpoint === "settings") {
      return Response.json({
        settings:
          '<script class="jdgm-settings-script">window.jdgmSettings={"verified_count_badge_style":"branded","verified_count_badge_orientation":"horizontal","verified_count_badge_color":"#108474"};</script><style>.jdgm-verified-badge{gap:8px}</style>',
      });
    }

    return Response.json({ html_miracle: "" });
  };

  const data = await fetchVerifiedReviewsCounter({
    shopDomain: "store.myshopify.com",
    publicToken: "public-token",
    fetch: mockFetch,
  });

  assert.deepEqual(requestedEndpoints.sort(), [
    "html_miracle",
    "settings",
    "verified_badge",
  ]);
  assert.ok(data);
  assert.equal(data.count, 866);
  assert.match(data.html, /jdgm-verified-badge__total">866/);
  assert.equal(data.settings.verified_count_badge_style, "branded");
  assert.match(data.styles, /gap:8px/);
});

test("returns null when the store is ineligible for the Verified Reviews Counter", async () => {
  const mockFetch = async (input) => {
    const endpoint = new URL(input).pathname.split("/").pop();

    if (endpoint === "verified_badge") {
      return Response.json({ verified_badge: null });
    }

    if (endpoint === "settings") {
      return Response.json({
        settings:
          '<script class="jdgm-settings-script">window.jdgmSettings={};</script>',
      });
    }

    return Response.json({ html_miracle: "" });
  };

  assert.equal(
    await fetchVerifiedReviewsCounter({
      shopDomain: "store.myshopify.com",
      publicToken: "public-token",
      fetch: mockFetch,
    }),
    null,
  );
});

test("fetches the exact v3 Reviews Grid from Judge.me's public CDN", async () => {
  const requestedEndpoints = [];
  const mockFetch = async (input) => {
    const url = new URL(input);
    const endpoint = url.pathname.split("/").pop();
    requestedEndpoints.push(endpoint);

    assert.equal(url.searchParams.get("shop_domain"), "store.myshopify.com");

    if (endpoint === "reviews_grid_widget_data") {
      assert.equal(url.hostname, "cdn.judge.me");
      assert.equal(url.searchParams.has("api_token"), false);
      assert.equal(url.searchParams.get("platform"), "shopify");
      assert.equal(url.searchParams.get("review_selection"), "all");
      assert.equal(url.searchParams.get("display_order"), "media_first");
      assert.equal(url.searchParams.get("per_page"), "5");

      return Response.json({
        current_page: 1,
        per_page: 5,
        review_selection: "all",
        reviews: [
          {
            uuid: "review-1",
            rating: 5,
            title: "A review",
            body: "Useful feedback",
          },
        ],
        total_count: 42,
        total_pages: 9,
      });
    }

    assert.equal(url.hostname, "judge.me");
    assert.equal(url.searchParams.get("api_token"), "public-token");

    if (endpoint === "all_reviews_count") {
      return Response.json({ all_reviews_count: 42 });
    }

    if (endpoint === "all_reviews_rating") {
      return Response.json({ all_reviews_rating: "4.64" });
    }

    if (endpoint === "settings") {
      return Response.json({
        settings:
          '<script class="jdgm-settings-script">window.jdgmSettings={"widget_version":"3.0","platform":"shopify"};</script>',
      });
    }

    return Response.json({ html_miracle: "" });
  };

  const data = await fetchReviewsGrid({
    shopDomain: "store.myshopify.com",
    publicToken: "public-token",
    config: {
      numberOfColumnsDesktop: 5,
      numberOfRowsDesktop: 1,
    },
    fetch: mockFetch,
  });

  assert.deepEqual(requestedEndpoints.sort(), [
    "all_reviews_count",
    "all_reviews_rating",
    "html_miracle",
    "reviews_grid_widget_data",
    "settings",
  ]);
  assert.equal(data.aggregate.count, 42);
  assert.equal(data.aggregate.rating, 4.64);
  assert.equal(data.config.numberOfColumnsDesktop, 5);
  assert.equal(data.config.numberOfRowsDesktop, 1);
  assert.equal(data.page.reviews.length, 1);
  assert.equal(data.page.totalPages, 9);
  assert.equal(data.settings.widget_version, "3.0");
  assert.equal(data.settings.review_widget_revamp_enabled, false);
});

test("fetches the exact Cards Carousel from Judge.me's tokenless CDN", async () => {
  const requestedEndpoints = [];
  const mockFetch = async (input) => {
    const url = new URL(input);
    const endpoint = url.pathname.split("/").pop();
    requestedEndpoints.push(endpoint);

    assert.equal(url.searchParams.get("shop_domain"), "store.myshopify.com");

    if (endpoint === "reviews_for_carousel") {
      assert.equal(url.hostname, "cdn.judge.me");
      assert.equal(url.searchParams.has("api_token"), false);
      assert.equal(url.searchParams.get("carousel_type"), "cards");
      assert.equal(
        url.searchParams.get("reviews_selection"),
        "current_product",
      );
      assert.equal(url.searchParams.get("product_ids"), "12345");
      assert.equal(url.searchParams.get("star_rating"), "4_to_5_star");
      assert.equal(url.searchParams.get("max_reviews"), "12");
      assert.equal(url.searchParams.get("display_order"), "most_recent");

      return Response.json({
        reviews: [
          {
            uuid: "review-1",
            rating: 5,
            body_html: "<p>Excellent</p>",
            reviewer_name: "Ada",
            card_type: "text",
          },
        ],
      });
    }

    assert.equal(url.hostname, "judge.me");
    assert.equal(url.searchParams.get("api_token"), "public-token");

    if (endpoint === "all_reviews_count") {
      return Response.json({ all_reviews_count: 42 });
    }

    if (endpoint === "all_reviews_rating") {
      return Response.json({ all_reviews_rating: "4.64" });
    }

    if (endpoint === "settings") {
      return Response.json({
        settings:
          '<script class="jdgm-settings-script">window.jdgmSettings={"widget_show_verified_branding":true};</script><style>.jdgm-star{color:teal}</style>',
      });
    }

    return Response.json({
      html_miracle: "<style>.jdgm-card{display:flex}</style>",
    });
  };

  const data = await fetchCardsCarousel({
    shopDomain: "store.myshopify.com",
    publicToken: "public-token",
    productId: "gid://shopify/Product/12345",
    config: {
      reviewSelection: "current_product",
      starRating: "4-5",
      maxReviews: 12,
      displayOrder: "most_recent",
    },
    fetch: mockFetch,
  });

  assert.deepEqual(requestedEndpoints.sort(), [
    "all_reviews_count",
    "all_reviews_rating",
    "html_miracle",
    "reviews_for_carousel",
    "settings",
  ]);
  assert.equal(data.aggregate.count, 42);
  assert.equal(data.aggregate.rating, 4.64);
  assert.equal(data.page.reviews.length, 1);
  assert.equal(data.productId, "12345");
  assert.match(data.styles, /jdgm-card/);
});

test("maps a headless cart selection to explicit public product reads", async () => {
  const page = await fetchCardsCarouselPage({
    shopDomain: "store.myshopify.com",
    config: {
      reviewSelection: "cart",
      selectedProductIds: [
        "gid://shopify/Product/12345",
        "gid://shopify/Product/67890",
      ],
    },
    fetch: async (input) => {
      const url = new URL(input);
      assert.equal(
        url.searchParams.get("reviews_selection"),
        "custom_products",
      );
      assert.deepEqual(url.searchParams.getAll("product_ids[]"), [
        "12345",
        "67890",
      ]);
      return Response.json({ reviews: [] });
    },
  });

  assert.equal(page.reviewSelection, "cart");
  assert.deepEqual(page.reviews, []);
});

test("fetches the exact Testimonials Carousel from Judge.me's tokenless CDN", async () => {
  const requestedEndpoints = [];
  const mockFetch = async (input) => {
    const url = new URL(input);
    const endpoint = url.pathname.split("/").pop();
    requestedEndpoints.push(endpoint);

    assert.equal(url.searchParams.get("shop_domain"), "store.myshopify.com");

    if (endpoint === "reviews_for_carousel") {
      assert.equal(url.hostname, "cdn.judge.me");
      assert.equal(url.searchParams.has("api_token"), false);
      assert.equal(url.searchParams.get("carousel_type"), "testimonials");
      assert.equal(
        url.searchParams.get("reviews_selection"),
        "current_product",
      );
      assert.equal(url.searchParams.get("product_ids"), "12345");
      assert.equal(url.searchParams.get("star_rating"), "5_star");
      assert.equal(url.searchParams.get("max_reviews"), "16");
      assert.equal(url.searchParams.has("display_order"), false);

      return Response.json({
        reviews: [
          {
            uuid: "testimonial-1",
            rating: 5,
            body_html: "<p>Wonderful</p>",
            reviewer_name: "Grace",
            verified_buyer: true,
            product_title: "Poster",
            product_url: "/products/poster",
          },
        ],
      });
    }

    assert.equal(url.hostname, "judge.me");
    assert.equal(url.searchParams.get("api_token"), "public-token");

    if (endpoint === "all_reviews_count") {
      return Response.json({ all_reviews_count: 42 });
    }

    if (endpoint === "all_reviews_rating") {
      return Response.json({ all_reviews_rating: "4.64" });
    }

    if (endpoint === "settings") {
      return Response.json({
        settings:
          '<script class="jdgm-settings-script">window.jdgmSettings={"widget_show_verified_branding":true};</script><style>.jdgm-star{color:teal}</style>',
      });
    }

    return Response.json({
      html_miracle: "<style>.jdgm-testimonial{display:flex}</style>",
    });
  };

  const data = await fetchTestimonialsCarousel({
    shopDomain: "store.myshopify.com",
    publicToken: "public-token",
    productId: "gid://shopify/Product/12345",
    config: {
      reviewSelection: "current_product",
      starRating: "5",
      maxReviews: 16,
      arrowsPosition: "bottom",
      quoteMarksStyle: "typewritten",
    },
    fetch: mockFetch,
  });

  assert.deepEqual(requestedEndpoints.sort(), [
    "all_reviews_count",
    "all_reviews_rating",
    "html_miracle",
    "reviews_for_carousel",
    "settings",
  ]);
  assert.equal(data.aggregate.count, 42);
  assert.equal(data.aggregate.rating, 4.64);
  assert.equal(data.page.reviews.length, 1);
  assert.equal(data.productId, "12345");
  assert.equal(data.config.arrowsPosition, "bottom");
  assert.equal(data.config.quoteMarksStyle, "typewritten");
  assert.match(data.styles, /jdgm-testimonial/);
});

test("normalizes Testimonials Carousel settings and cart product IDs", async () => {
  const config = normalizeTestimonialsCarouselConfig({
    maxReviews: 30,
    maxWidth: 1600,
    transitionSpeed: 0,
    headerText: "  Stories from customers  ",
  });
  assert.equal(config.maxReviews, 30);
  assert.equal(config.maxWidth, 1600);
  assert.equal(config.transitionSpeed, 0);
  assert.equal(config.headerText, "Stories from customers");
  assert.equal(config.cardHeight, "medium");

  const page = await fetchTestimonialsCarouselPage({
    shopDomain: "store.myshopify.com",
    config: {
      reviewSelection: "cart",
      selectedProductIds: [
        "gid://shopify/Product/12345",
        "gid://shopify/Product/67890",
      ],
    },
    fetch: async (input) => {
      const url = new URL(input);
      assert.equal(url.searchParams.get("carousel_type"), "testimonials");
      assert.equal(
        url.searchParams.get("reviews_selection"),
        "custom_products",
      );
      assert.deepEqual(url.searchParams.getAll("product_ids[]"), [
        "12345",
        "67890",
      ]);
      return Response.json({ reviews: [] });
    },
  });

  assert.equal(page.reviewSelection, "cart");
  assert.deepEqual(page.reviews, []);
});

test("fetches the exact Videos Carousel from Judge.me's tokenless CDN", async () => {
  const requestedEndpoints = [];
  const mockFetch = async (input) => {
    const url = new URL(input);
    const endpoint = url.pathname.split("/").pop();
    requestedEndpoints.push(endpoint);

    assert.equal(url.searchParams.get("shop_domain"), "store.myshopify.com");

    if (endpoint === "reviews_for_carousel") {
      assert.equal(url.hostname, "cdn.judge.me");
      assert.equal(url.searchParams.has("api_token"), false);
      assert.equal(url.searchParams.get("carousel_type"), "videos");
      assert.equal(url.searchParams.get("review_type"), "photo_and_video");
      assert.equal(
        url.searchParams.get("reviews_selection"),
        "current_product",
      );
      assert.equal(url.searchParams.get("product_ids"), "12345");
      assert.equal(url.searchParams.get("star_rating"), "3_to_5_star");
      assert.equal(url.searchParams.get("max_reviews"), "18");
      assert.equal(url.searchParams.has("display_order"), false);

      return Response.json({
        reviews: [
          {
            uuid: "video-carousel-card-1",
            rating: 5,
            card_type: "photo",
            reviewer_name: "Katherine",
            picture: {
              urls: { huge: "https://review-images.judge.me/example.jpg" },
            },
          },
        ],
      });
    }

    assert.equal(url.hostname, "judge.me");
    assert.equal(url.searchParams.get("api_token"), "public-token");

    if (endpoint === "all_reviews_count") {
      return Response.json({ all_reviews_count: 42 });
    }

    if (endpoint === "all_reviews_rating") {
      return Response.json({ all_reviews_rating: "4.64" });
    }

    if (endpoint === "settings") {
      return Response.json({
        settings:
          '<script class="jdgm-settings-script">window.jdgmSettings={"widget_show_verified_branding":true};</script><style>.jdgm-star{color:teal}</style>',
      });
    }

    return Response.json({
      html_miracle: "<style>.jdgm-videos-carousel{display:block}</style>",
    });
  };

  const data = await fetchVideosCarousel({
    shopDomain: "store.myshopify.com",
    publicToken: "public-token",
    productId: "gid://shopify/Product/12345",
    config: {
      reviewSelection: "current_product",
      reviewType: "photos-and-videos",
      starRating: "3-5",
      maxReviews: 18,
      carouselStyle: "perspective",
    },
    fetch: mockFetch,
  });

  assert.deepEqual(requestedEndpoints.sort(), [
    "all_reviews_count",
    "all_reviews_rating",
    "html_miracle",
    "reviews_for_carousel",
    "settings",
  ]);
  assert.equal(data.aggregate.count, 42);
  assert.equal(data.aggregate.rating, 4.64);
  assert.equal(data.page.reviews.length, 1);
  assert.equal(data.productId, "12345");
  assert.equal(data.config.carouselStyle, "perspective");
  assert.match(data.styles, /jdgm-videos-carousel/);
});

test("normalizes Videos Carousel settings and cart product IDs", async () => {
  const config = normalizeVideosCarouselConfig({
    maxReviews: 30,
    maxWidth: 1600,
    transitionSpeed: 0,
    headerText: "  Customer videos  ",
  });
  assert.equal(config.maxReviews, 30);
  assert.equal(config.maxWidth, 1600);
  assert.equal(config.transitionSpeed, 0);
  assert.equal(config.headerText, "Customer videos");
  assert.equal(config.reviewType, "photos-and-videos");

  const page = await fetchVideosCarouselPage({
    shopDomain: "store.myshopify.com",
    config: {
      reviewSelection: "cart",
      reviewType: "videos-only",
      selectedProductIds: [
        "gid://shopify/Product/12345",
        "gid://shopify/Product/67890",
        "gid://shopify/Product/67890",
      ],
    },
    fetch: async (input) => {
      const url = new URL(input);
      assert.equal(url.searchParams.get("carousel_type"), "videos");
      assert.equal(url.searchParams.get("review_type"), "video");
      assert.equal(
        url.searchParams.get("reviews_selection"),
        "custom_products",
      );
      assert.deepEqual(url.searchParams.getAll("product_ids[]"), [
        "12345",
        "67890",
      ]);
      return Response.json({ reviews: [] });
    },
  });

  assert.equal(page.reviewSelection, "cart");
  assert.deepEqual(page.reviews, []);
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

test("supplies the app-embed shell for a wrapper-only Floating Reviews Tab", async () => {
  const mockFetch = async (input) => {
    const endpoint = new URL(input).pathname.split("/").pop();

    if (endpoint === "reviews_tab") {
      return Response.json({
        page: 1,
        reviews_tab:
          "<section class='jdgm-revs-tab__wrapper'><div class='jdgm-revs-tab__main'><div class='jdgm-revs-tab__content-header' data-number-of-product-reviews='9' data-number-of-shop-reviews='3'><div class='jdgm-histogram__row' data-rating='5' data-frequency='9'></div><div class='jdgm-histogram__row' data-rating='4' data-frequency='3'></div></div></div></section>",
      });
    }

    if (endpoint === "settings") {
      return Response.json({
        settings:
          '<script class=\'jdgm-settings-script\'>window.jdgmSettings={"floating_tab_tab_style":"stars","floating_tab_title":"Verified feedback"};</script>',
      });
    }

    return Response.json({ html_miracle: "" });
  };

  const data = await fetchFloatingReviewsTab({
    shopDomain: "store.myshopify.com",
    publicToken: "public-token",
    fetch: mockFetch,
  });

  assert.equal(data.source, "reviews-tab");
  assert.match(data.html, /class="jdgm-widget jdgm-revs-tab"/);
  assert.match(data.html, /class="jdgm-revs-tab-btn btn"/);
  assert.match(data.html, /data-score="4\.75"/);
  assert.match(data.html, />12<\/span> reviews/);
  assert.match(data.html, /Verified feedback/);
  assert.match(data.html, /class='jdgm-revs-tab__wrapper'/);
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

    if (endpoint === "verified_badge") {
      assert.equal(url.searchParams.has("external_id"), false);
      return Response.json({
        verified_badge:
          '<div class="jdgm-widget jdgm-verified-badge"><div class="jdgm-verified-badge__image" data-url="/badge.png"></div><div class="jdgm-verified-badge__total">27</div></div>',
      });
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
    "verified_badge",
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
  assert.equal(data.verifiedReviewsCounter?.count, 27);
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

test("normalizes dashboard popup settings and its public review feed", async () => {
  const settings = {
    popup_widget_review_selection: "automatically_with_pictures",
    popup_widget_round_border_style: false,
    popup_widget_show_title: true,
    popup_widget_show_body: true,
    popup_widget_show_reviewer: true,
    popup_widget_show_product: false,
    popup_widget_show_pictures: true,
    popup_widget_use_review_picture: true,
    popup_widget_show_on_home_page: false,
    popup_widget_show_on_product_page: true,
    popup_widget_show_on_collection_page: false,
    popup_widget_show_on_cart_page: true,
    popup_widget_position: "top_right",
    popup_widget_first_review_delay: 2,
    popup_widget_duration: 7,
    popup_widget_interval: 11,
    popup_widget_review_count: 2,
    popup_widget_hide_on_mobile: false,
    widget_star_color: "#123456",
  };
  const mockFetch = async (input) => {
    const url = new URL(input);

    assert.equal(url.origin, "https://cdn.judge.me");
    assert.equal(url.pathname, "/reviews/reviews_for_carousel");
    assert.equal(url.searchParams.get("reviews_selection"), "all");
    assert.equal(url.searchParams.get("carousel_type"), "cards");
    assert.equal(url.searchParams.get("star_rating"), "5_star");
    assert.equal(url.searchParams.get("display_order"), "media_first");
    assert.equal(url.searchParams.get("max_reviews"), "30");
    assert.equal(url.searchParams.get("shop_domain"), "store.myshopify.com");

    return Response.json({
      reviews: [
        {
          uuid: "review-one",
          title: "Excellent",
          body: "A public review body",
          rating: 5,
          reviewer_name: "A. Customer",
          product_title: "Example product",
          product_url:
            "https://store.myshopify.com/products/example-product?utm_source=judge.me",
          pictures_urls: [
            {
              compact: "https://review-images.judge.me/example/compact.jpg",
            },
          ],
        },
        {
          uuid: "review-two",
          title: "Still great",
          body: "Another public review body",
          rating: 5,
          reviewer_name: "B. Customer",
          product_title: "Second product",
          product_url: "https://store.myshopify.com/products/second-product",
          pictures_urls: [],
        },
      ],
    });
  };

  const page = await fetchPopupReviewsPage({
    shopDomain: "store.myshopify.com",
    settings,
    productImageUrlsByHandle: {
      "example-product": "https://cdn.shopify.com/example-product.jpg",
    },
    fetch: mockFetch,
  });
  const data = createPopupReviewsData({
    page,
    settings,
    shopDomain: "store.myshopify.com",
  });

  assert.equal(data.config.selection, "recent-five-star-with-pictures");
  assert.equal(data.config.imageMode, "review");
  assert.equal(data.config.position, "top_right");
  assert.equal(data.config.reviewCount, 2);
  assert.equal(data.config.durationSeconds, 7);
  assert.equal(data.config.starColor, "#123456");
  assert.equal(data.page.reviews.length, 2);
  assert.equal(
    data.page.reviews[0].productUrl,
    "/products/example-product?utm_source=judge.me",
  );
  assert.equal(
    data.page.reviews[0].reviewPictureUrl,
    "https://review-images.judge.me/example/compact.jpg",
  );
  assert.equal(
    data.page.reviews[0].productPictureUrl,
    "https://cdn.shopify.com/example-product.jpg",
  );
});

test("maps manual popup selection and clamps dashboard timing values", () => {
  const config = normalizePopupReviewsConfig({
    popup_widget_review_selection: "manually_featured",
    popup_widget_show_pictures: true,
    popup_widget_use_review_picture: false,
    popup_widget_first_review_delay: -10,
    popup_widget_duration: 0,
    popup_widget_interval: 999,
    popup_widget_review_count: 99,
  });

  assert.equal(config.selection, "featured");
  assert.equal(config.imageMode, "product");
  assert.equal(config.firstReviewDelaySeconds, 0);
  assert.equal(config.durationSeconds, 1);
  assert.equal(config.intervalSeconds, 300);
  assert.equal(config.reviewCount, 15);
});

test("normalizes the AI Reviews Summary metafield and all block settings", () => {
  const metafieldValue = JSON.stringify({
    average_rating: "4.8",
    number_of_reviews: 867,
    ai_summary_text: "Customers consistently praise the quality and delivery.",
    ai_summary_translations: {
      de: "Kundinnen und Kunden loben die Qualität und Lieferung.",
      empty: "",
    },
    keywords: [
      { keyword: "Quality", sentiment: "positive" },
      { keyword: "Delivery", sentiment: "neutral" },
    ],
  });
  const data = createAiReviewsSummaryData({
    config: {
      theme: "button",
      alignment: "center",
      cornerStyle: "extra_round",
      maxWidth: 900,
      headingText: "  Customers rate us  ",
      buttonText: "  Read the summary  ",
      showSentimentColors: true,
    },
    metafieldValue,
    settings: { locale: "en", shop_locale: "en" },
    shopDomain: "https://STORE.myshopify.com/products/example",
  });

  assert.ok(data);
  assert.equal(data.shopDomain, "store.myshopify.com");
  assert.equal(data.source, "metafield");
  assert.equal(data.config.theme, "button");
  assert.equal(data.config.alignment, "center");
  assert.equal(data.config.cornerStyle, "extra_round");
  assert.equal(data.config.maxWidth, 900);
  assert.equal(data.config.headingText, "Customers rate us");
  assert.equal(data.config.buttonText, "Read the summary");
  assert.equal(data.config.showSentimentColors, true);
  assert.equal(data.payload.averageRating, 4.8);
  assert.equal(data.payload.reviewCount, 867);
  assert.deepEqual(data.payload.keywords, [
    { keyword: "Quality", sentiment: "positive" },
    { keyword: "Delivery", sentiment: "neutral" },
  ]);
  assert.deepEqual(data.payload.summaryTranslations, {
    de: "Kundinnen und Kunden loben die Qualität und Lieferung.",
  });

  assert.equal(parseAiReviewsSummaryMetafield(null), null);
  assert.throws(
    () =>
      parseAiReviewsSummaryMetafield({
        average_rating: 6,
        number_of_reviews: 1,
        ai_summary_text: "Invalid rating",
      }),
    /invalid AI Reviews Summary data/,
  );
  assert.throws(
    () => normalizeAiReviewsSummaryConfig({ maxWidth: 200 }),
    /between 320 and 2000/,
  );
});

test("reads public AI Reviews Summary generation status without a token", async () => {
  const status = await fetchAiReviewsSummaryStatus({
    shopDomain: "store.myshopify.com",
    fetch: async (input, init) => {
      const url = new URL(input);
      assert.equal(url.origin, "https://api.judge.me");
      assert.equal(url.pathname, "/store_summary/status");
      assert.equal(url.searchParams.get("shop_domain"), "store.myshopify.com");
      assert.equal(url.searchParams.get("platform"), "shopify");
      assert.equal(url.searchParams.has("api_token"), false);
      assert.equal(init?.headers.Accept, "application/json");

      return Response.json({
        generating: false,
        has_sufficient_reviews: true,
        generate_summary_url: "https://admin.shopify.com/example",
      });
    },
  });

  assert.deepEqual(status, {
    generating: false,
    hasSufficientReviews: true,
  });
});

test("fetches the exact Review Snippets feed without a token", async () => {
  const page = await fetchReviewSnippetsPage({
    shopDomain: "https://STORE.myshopify.com/products/example",
    productId: "gid://shopify/Product/12345",
    config: {
      reviewSelection: "current_product",
      maxReviews: 5,
      minStarRating: "5",
      filterPinned: true,
      customTags: ["gift"],
    },
    fetch: async (input, init) => {
      const url = new URL(input);
      assert.equal(url.origin, "https://api.judge.me");
      assert.equal(url.pathname, "/reviews/reviews_for_review_snippet_widget");
      assert.equal(url.searchParams.get("v"), "2");
      assert.equal(url.searchParams.get("product_id"), "12345");
      assert.equal(url.searchParams.get("selection_source"), "current_product");
      assert.equal(url.searchParams.get("count"), "5");
      assert.equal(url.searchParams.get("min_star_rating"), "5");
      assert.deepEqual(url.searchParams.getAll("tag_filter[]"), ["pinned"]);
      assert.deepEqual(url.searchParams.getAll("custom_tags[]"), ["gift"]);
      assert.equal(url.searchParams.get("shop_domain"), "store.myshopify.com");
      assert.equal(url.searchParams.get("platform"), "shopify");
      assert.equal(url.searchParams.has("api_token"), false);
      assert.equal(init?.headers.Accept, "application/json");

      return Response.json({
        reviews: [
          {
            uuid: "snippet-review-1",
            rating: 5,
            public_reviewer_name: "Customer",
            body_html: "<p>Excellent print.</p>",
            review_image_url: null,
          },
        ],
        settings: {
          legacy_snippets_shop: true,
          star_color: "#108474",
          card_color: "#ffffff",
        },
      });
    },
  });
  const data = createReviewSnippetsData({
    config: {
      reviewSelection: "current_product",
      maxReviews: 5,
      minStarRating: "5",
      filterPinned: true,
      customTags: ["gift"],
    },
    page,
    productId: "gid://shopify/Product/12345",
    settings: { locale: "en" },
    shopDomain: "store.myshopify.com",
  });

  assert.equal(data.productId, "12345");
  assert.equal(data.page.reviews.length, 1);
  assert.equal(data.page.reviews[0].uuid, "snippet-review-1");
  assert.equal(data.page.settings.star_color, "#108474");
});

test("normalizes Review Snippets block settings and validates public HTML", async () => {
  const config = normalizeReviewSnippetsConfig({
    reviewSelection: "custom",
    selectedProductIds: [
      "gid://shopify/Product/12345",
      "gid://shopify/Product/12345",
      "67890",
    ],
    customTags: [" gift ", "gift", "photo"],
    maxReviews: 10,
    transitionSpeed: 0,
    arrowsVisibility: "hidden_on_mobile",
    cornerStyle: "extra_round",
    starsColor: "  #123456  ",
  });

  assert.deepEqual(config.selectedProductIds, [
    "gid://shopify/Product/12345",
    "67890",
  ]);
  assert.deepEqual(config.customTags, ["gift", "photo"]);
  assert.equal(config.transitionSpeed, 0);
  assert.equal(config.starsColor, "#123456");

  await assert.rejects(
    fetchReviewSnippetsPage({
      shopDomain: "store.myshopify.com",
      productId: "12345",
      config: { reviewSelection: "current_product" },
      fetch: async () =>
        Response.json({
          reviews: [
            {
              uuid: "unsafe-review",
              rating: 5,
              public_reviewer_name: "Customer",
              body_html: '<img src="x" onerror="alert(1)">',
            },
          ],
          settings: {},
        }),
    }),
    /executable Review Snippets markup/,
  );
  assert.throws(
    () => normalizeReviewSnippetsConfig({ maxReviews: 11 }),
    /review count must be between 1 and 10/,
  );
});

test("fetches and normalizes the tokenless Questions & Answers feed", async () => {
  const page = await fetchQuestionsAndAnswersPage({
    shopDomain: "https://STORE.myshopify.com/products/example",
    productId: "gid://shopify/Product/12345",
    page: 1,
    previewMode: "sample_data",
    fetch: async (input, init) => {
      const url = new URL(input);
      assert.equal(url.origin, "https://api.judge.me");
      assert.equal(url.pathname, "/api/questions/questions_for_widget");
      assert.equal(url.searchParams.get("product_id"), "12345");
      assert.equal(url.searchParams.get("page"), "1");
      assert.equal(url.searchParams.get("json_request"), "true");
      assert.equal(url.searchParams.get("shop_domain"), "store.myshopify.com");
      assert.equal(url.searchParams.get("platform"), "shopify");
      assert.equal(url.searchParams.get("preview_mode"), "sample_data");
      assert.equal(url.searchParams.has("api_token"), false);
      assert.equal(init?.headers.Accept, "application/json");

      return Response.json({
        total_pages: 2,
        current_page: 1,
        per_page: 2,
        questions: [
          {
            uuid: "question-1",
            content_html: "<p>Does it contain &amp; use cotton?</p>",
            created_at: "2025-01-25T10:30:00.000+00:00",
            shop_as_asker: false,
            asker_name: "Emma Wilson",
            asker_initial: "E",
            answers: [
              {
                uuid: "answer-1",
                content_html: "<p>Yes.<br>It uses organic cotton.</p>",
                created_at: "2025-01-26T09:15:00.000+00:00",
                shop_as_answerer: true,
                answerer_name: "Store Team",
                answerer_initial: "S",
              },
            ],
          },
        ],
      });
    },
  });

  assert.equal(page.productId, "12345");
  assert.equal(page.previewMode, "sample_data");
  assert.equal(page.totalPages, 2);
  assert.equal(page.questions[0].content, "Does it contain & use cotton?");
  assert.equal(
    page.questions[0].answers[0].content,
    "Yes.\nIt uses organic cotton.",
  );
});

test("maps Q&A dashboard settings and rejects mismatched product data", () => {
  const settings = {
    review_widget_qna_enabled: true,
    review_widget_reviews_section_theme: "cards",
    widget_questions_and_answers_text: "Product questions",
    widget_open_question_form_text: "Ask us",
    qna_content_screen_title_text: "What would you like to know?",
    qna_widget_flow_gdpr_statement:
      "We'll contact you under our <a href='https://judge.me/privacy'>privacy policy</a>.",
    qna_widget_answer_reply_label: "Reply from {{ answerer_name }}:",
    review_widget_button_color: "#123456",
    review_widget_corner_styling: "round",
    review_widget_review_title_text_size: "large",
  };
  const config = normalizeQuestionsAndAnswersConfig(settings);

  assert.equal(config.dashboardEnabled, true);
  assert.equal(config.theme, "cards");
  assert.equal(config.headingText, "Product questions");
  assert.equal(config.askQuestionText, "Ask us");
  assert.equal(config.buttonColor, "#123456");
  assert.equal(config.cornerStyle, "round");
  assert.equal(config.titleTextSize, "large");
  assert.equal(
    config.privacyText,
    "We'll contact you under our privacy policy.",
  );

  const page = {
    currentPage: 1,
    totalPages: 1,
    perPage: 5,
    productId: "12345",
    questions: [],
  };
  const data = createQuestionsAndAnswersData({
    page,
    productId: "gid://shopify/Product/12345",
    productTitle: "Poster",
    productHandle: "/products/poster",
    settings,
    shopDomain: "store.myshopify.com",
  });
  assert.deepEqual(data.product, {
    id: "12345",
    title: "Poster",
    handle: "poster",
  });

  assert.throws(
    () =>
      createQuestionsAndAnswersData({
        page,
        productId: "99999",
        productTitle: "Poster",
        productHandle: "poster",
        settings,
        shopDomain: "store.myshopify.com",
      }),
    /mismatched Questions & Answers/,
  );
});

test("submits a shopper question without either Judge.me token", async () => {
  let requestCount = 0;
  await submitQuestion({
    shopDomain: "https://STORE.myshopify.com/products/example",
    productId: "gid://shopify/Product/12345",
    productTitle: "Wall Art Poster",
    productHandle: "/products/wall-art-poster",
    name: "Ada Lovelace",
    email: "ada@example.com",
    question: "Can this be framed?",
    fetch: async (input, init) => {
      requestCount += 1;
      const url = new URL(input);
      assert.equal(url.origin, "https://api.judge.me");
      assert.equal(url.pathname, "/api/questions");
      assert.equal(url.searchParams.has("api_token"), false);
      assert.equal(init?.method, "POST");
      assert.ok(init?.body instanceof FormData);
      assert.equal(init.body.get("name"), "Ada Lovelace");
      assert.equal(init.body.get("email"), "ada@example.com");
      assert.equal(init.body.get("question_content"), "Can this be framed?");
      assert.equal(init.body.get("id"), "12345");
      assert.equal(init.body.get("product_title"), "Wall Art Poster");
      assert.equal(init.body.get("handle"), "wall-art-poster");
      assert.equal(init.body.get("shop_domain"), "store.myshopify.com");
      assert.equal(init.body.get("platform"), "shopify");
      assert.equal(init.body.has("api_token"), false);
      return Response.json({ ok: true });
    },
  });
  assert.equal(requestCount, 1);

  await assert.rejects(
    submitQuestion({
      shopDomain: "store.myshopify.com",
      productId: "12345",
      productTitle: "Poster",
      productHandle: "poster",
      name: "Ada",
      email: "not-an-email",
      question: "Can this be framed?",
      fetch: async () => {
        throw new Error("fetch should not be called");
      },
    }),
    /valid email address/,
  );
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
