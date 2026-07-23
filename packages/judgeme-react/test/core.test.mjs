import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  createReviewSnippetsPreloadedResponse,
  shouldUpdateCarouselHeaderText,
} from "../dist/exact-runtime.js";
import { ensureJudgeMeDashboardStyles } from "../dist/dashboard-styles.js";
import { createReviewWidgetV3OverlayController } from "../dist/review-widget-v3-overlay.js";
import { startJudgeMeRuntime } from "../dist/runtime-lifecycle.js";
import {
  createAiReviewsSummaryData,
  createHappyCustomersData,
  createPopupReviewsData,
  createQuestionsAndAnswersData,
  createReviewSnippetsData,
  createReviewWidgetV3Data,
  createTrustBadgeData,
  createJudgeMeConfig,
  clearJudgeMeV3AssetDiscoveryCache,
  fetchCardsCarousel,
  fetchCardsCarouselPage,
  fetchAllReviewsCounter,
  fetchAllReviewsWidget,
  fetchFloatingReviewsTab,
  fetchJudgeMeMedals,
  fetchLegacyProductWidgets,
  fetchLegacyReviewWidget,
  fetchLegacyStorefrontWidgets,
  fetchAiReviewsSummaryMetafield,
  fetchAiReviewsSummaryStatus,
  fetchHappyCustomersPage,
  fetchPopupReviewsPage,
  fetchQuestionsAndAnswersPage,
  fetchReviewSnippetsPage,
  fetchReviewWidgetV3,
  fetchReviewWidgetV3Page,
  fetchReviewsCarousel,
  fetchReviewsGrid,
  fetchReviewsGridPage,
  fetchStarRatingBadge,
  fetchTestimonialsCarousel,
  fetchTestimonialsCarouselPage,
  fetchTrustBadgeMetafields,
  fetchUgcMediaGrid,
  fetchVerifiedReviewsCounter,
  fetchVideosCarousel,
  fetchVideosCarouselPage,
  getShopifyNumericId,
  JudgeMeWidgetStyles,
  normalizeTestimonialsCarouselConfig,
  normalizeTrustBadgeConfig,
  normalizeAiReviewsSummaryConfig,
  normalizeHappyCustomersConfig,
  normalizePopupReviewsConfig,
  normalizeQuestionsAndAnswersConfig,
  normalizeReviewSnippetsConfig,
  normalizeReviewWidgetV3Config,
  normalizeVideosCarouselConfig,
  parseAiReviewsSummaryMetafield,
  resolveJudgeMeV3AssetDeployment,
  resolveJudgeMeEngine,
  submitQuestion,
  TrustBadge,
  HappyCustomers,
  ReviewWidgetV3,
} from "../dist/index.js";

test("publishes separate React and server entry points", async () => {
  const [reactEntry, serverEntry] = await Promise.all([
    import("../dist/react.js"),
    import("../dist/server.js"),
  ]);

  assert.equal(typeof reactEntry.JudgeMeProvider, "function");
  assert.equal(typeof reactEntry.StarRatingBadge, "function");
  assert.equal("fetchLegacyProductWidgets" in reactEntry, false);
  assert.equal(typeof serverEntry.fetchLegacyProductWidgets, "function");
  assert.equal(typeof serverEntry.resolveJudgeMeV3AssetDeployment, "function");
  assert.equal("JudgeMeProvider" in serverEntry, false);
});

test("publishes resolvable source maps", async () => {
  const packageUrl = new URL("../", import.meta.url);
  const distUrl = new URL("../dist/", import.meta.url);
  const packageJson = JSON.parse(
    await readFile(new URL("package.json", packageUrl), "utf8"),
  );
  const files = await readdir(distUrl);
  const sourceMapFiles = files.filter((file) => file.endsWith(".map"));

  assert.ok(sourceMapFiles.length > 0, "expected the build to emit source maps");

  for (const file of sourceMapFiles) {
    const sourceMapUrl = new URL(file, distUrl);
    const sourceMap = JSON.parse(
      await readFile(sourceMapUrl, "utf8"),
    );

    assert.ok(
      Array.isArray(sourceMap.sources) && sourceMap.sources.length > 0,
      `${file} must reference at least one source`,
    );
    for (const [index, source] of sourceMap.sources.entries()) {
      if (typeof sourceMap.sourcesContent?.[index] === "string") continue;

      const sourceUrl = new URL(source, sourceMapUrl);
      const packagePath = relative(
        fileURLToPath(packageUrl),
        fileURLToPath(sourceUrl),
      ).replaceAll("\\", "/");

      assert.ok(
        !packagePath.startsWith("../") &&
          packageJson.files.some(
            (publishedPath) =>
              packagePath === publishedPath ||
              packagePath.startsWith(`${publishedPath}/`),
          ),
        `${file} source ${source} must be covered by the npm files allowlist`,
      );
      await readFile(sourceUrl, "utf8");
    }
  }
});

test("publishes the final npm identity with matching MIT licenses", async () => {
  const [packageJsonSource, exampleJsonSource, packageLicense, repositoryLicense] =
    await Promise.all([
      readFile(new URL("../package.json", import.meta.url), "utf8"),
      readFile(
        new URL("../../../examples/hydrogen/package.json", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../LICENSE", import.meta.url), "utf8"),
      readFile(new URL("../../../LICENSE", import.meta.url), "utf8"),
    ]);
  const packageJson = JSON.parse(packageJsonSource);
  const exampleJson = JSON.parse(exampleJsonSource);

  assert.equal(packageJson.name, "judgeme-react");
  assert.equal(packageJson.version, "1.0.8");
  assert.equal(exampleJson.dependencies[packageJson.name], packageJson.version);
  assert.equal(packageJson.license, "MIT");
  assert.equal(packageJson.author, "Filip Ljubic");
  assert.equal(packageLicense, repositoryLicense);
  assert.match(repositoryLicense, /Copyright \(c\) 2026 Filip Ljubic/);
});

test("documents the current Judge.me review image CSP origin", async () => {
  const requiredOrigin = "https://review-images.judgeme.com";
  const [example, readme, setupPrompt] = await Promise.all([
    readFile(
      new URL("../../../examples/hydrogen/app/entry.server.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../SETUP_PROMPT.md", import.meta.url), "utf8"),
  ]);

  for (const source of [example, readme]) {
    assert.ok(
      source.includes(requiredOrigin),
      `${requiredOrigin} must remain in the documented img-src allowlist`,
    );
  }
  assert.ok(
    setupPrompt.includes("review-images.judgeme.com"),
    "the setup prompt must retain the review image host",
  );
});

test("initializes Happy Customers core before configuring its exact runtime", async () => {
  const source = await readFile(
    new URL("../src/exact-runtime.ts", import.meta.url),
    "utf8",
  );
  const initializerStart = source.indexOf(
    "async function initializeHappyCustomersRoot",
  );
  const initializerEnd = source.indexOf(
    "async function initializeReviewWidgetV3Root",
    initializerStart,
  );

  assert.notEqual(initializerStart, -1);
  assert.notEqual(initializerEnd, -1);

  const initializer = source.slice(initializerStart, initializerEnd);
  const ensureCore = initializer.indexOf("ensureJudgeMeCoreRuntime({");
  const ensureStyles = initializer.indexOf("ensureJudgeMeDashboardStyles({");
  const configureExact = initializer.indexOf(
    "const runtimeWindow = configureExactRuntime({",
  );

  assert.notEqual(ensureCore, -1);
  assert.notEqual(ensureStyles, -1);
  assert.ok(configureExact > ensureCore);
  assert.ok(configureExact > ensureStyles);
  assert.match(
    initializer,
    /ensureJudgeMeCoreRuntime\(\{\s+publicToken,\s+settings: data\.settings,\s+shopDomain: data\.shopDomain,\s+\}\)/,
  );
});

test("keeps the explicit dashboard style mount for backwards compatibility", () => {
  const element = JudgeMeWidgetStyles({
    data: {
      styles: "@font-face{font-family:'JudgemeStar'}",
    },
  });

  assert.equal(element.type, "style");
  assert.equal(element.props["data-judgeme-react-styles"], "legacy-widgets");
  assert.equal(
    element.props.dangerouslySetInnerHTML.__html,
    "@font-face{font-family:'JudgemeStar'}",
  );
  assert.equal(JudgeMeWidgetStyles({data: {styles: ""}}), null);
});

test("installs loader-provided dashboard styles without a browser request", async () => {
  const {document, styles} = createStyleDocument();
  let requests = 0;

  await ensureJudgeMeDashboardStyles({
    document,
    fetch: async () => {
      requests += 1;
      throw new Error("unexpected request");
    },
    shopDomain: "inline-styles.myshopify.com",
    styles: "@font-face{font-family:'JudgemeStar'}",
  });
  await ensureJudgeMeDashboardStyles({
    document,
    shopDomain: "inline-styles.myshopify.com",
  });

  assert.equal(requests, 0);
  assert.equal(styles.length, 1);
  assert.equal(
    styles[0].dataset.judgemeReactDashboardStyles,
    "inline-styles.myshopify.com",
  );
  assert.match(styles[0].textContent, /JudgemeStar/);
});

test("falls back to Judge.me's public cache for exact-widget dashboard CSS", async () => {
  const {document, styles} = createStyleDocument("csp-nonce");
  const requests = [];

  await ensureJudgeMeDashboardStyles({
    document,
    fetch: async (input) => {
      requests.push(String(input));
      return new Response(
        JSON.stringify({
          settings: "<style>.jdgm-star{font-family:JudgemeStar}</style>",
          html_miracle: "<style>@font-face{font-family:JudgemeStar}</style>",
        }),
        {status: 200, headers: {"Content-Type": "application/json"}},
      );
    },
    publicToken: "public-token",
    shopDomain: "fallback-styles.myshopify.com",
  });

  assert.equal(requests.length, 1);
  assert.match(
    requests[0],
    /^https:\/\/cache\.judge\.me\/widgets\/shopify\/fallback-styles\.myshopify\.com\?public_token=public-token$/,
  );
  assert.equal(styles.length, 1);
  assert.equal(styles[0].nonce, "csp-nonce");
  assert.match(styles[0].textContent, /\.jdgm-star/);
  assert.match(styles[0].textContent, /@font-face/);
});

test("widget components no longer let includeStyles disable required CSS", async () => {
  const componentSources = await Promise.all(
    [
      "all-reviews-counter.tsx",
      "all-reviews-widget.tsx",
      "cards-carousel.tsx",
      "floating-reviews-tab.tsx",
      "judge-me-medals.tsx",
      "legacy-review-widget.tsx",
      "popup-reviews.tsx",
      "questions-and-answers.tsx",
      "reviews-carousel.tsx",
      "star-rating-badge.tsx",
      "testimonials-carousel.tsx",
      "ugc-media-grid.tsx",
      "verified-reviews-counter.tsx",
      "videos-carousel.tsx",
    ].map((file) =>
      readFile(new URL(`../src/${file}`, import.meta.url), "utf8"),
    ),
  );

  for (const source of componentSources) {
    assert.doesNotMatch(source, /includeStyles\s+\?/);
    assert.doesNotMatch(source, /includeStyles\s*&&/);
    assert.match(source, /@deprecated Styles are loaded automatically\./);
  }
});

function createStyleDocument(nonce = "") {
  const styles = [];
  const document = {
    createElement(tagName) {
      assert.equal(tagName, "style");
      return {dataset: {}, textContent: ""};
    },
    head: {
      appendChild(style) {
        styles.push(style);
        return style;
      },
    },
    querySelector() {
      return nonce ? {nonce} : null;
    },
    querySelectorAll() {
      return styles;
    },
  };

  return {document, styles};
}

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

test("discovers and manifest-validates the current Judge.me v3 deployment", async () => {
  clearJudgeMeV3AssetDiscoveryCache();
  const storefrontUrl = "https://store.example/products/example";
  const unrelatedBase =
    "https://cdn.shopify.com/extensions/unrelated/other-app/assets/";
  const judgeMeBase =
    "https://cdn.shopify.com/extensions/deployment-2/judgeme-624/assets/";
  const requests = [];
  const mockFetch = async (input) => {
    const url = String(input);
    requests.push(url);

    if (url === storefrontUrl) {
      return new Response(
        `<script src="${unrelatedBase}loader.js"></script>` +
          `<script>window.asset = "${judgeMeBase.replaceAll("/", "\\/")}loader.js"</script>`,
        { status: 200, headers: { "content-type": "text/html" } },
      );
    }

    if (url === `${unrelatedBase}manifest.json`) {
      return Response.json({ "other/main.js": { file: "other.js" } });
    }

    if (url === `${judgeMeBase}manifest.json`) {
      return Response.json({
        "review-widget/main.js": { file: "review-widget.js" },
        "reviews-grid-widget/main.js": { file: "reviews-grid.js" },
      });
    }

    throw new Error(`Unexpected request: ${url}`);
  };

  const deployment = await resolveJudgeMeV3AssetDeployment({
    shopDomain: "store.myshopify.com",
    storefrontUrl,
    requiredManifestEntries: [
      "review-widget/main.js",
      "reviews-grid-widget/main.js",
    ],
    fetch: mockFetch,
  });

  assert.equal(deployment.assetBaseUrl, judgeMeBase);
  assert.equal(deployment.deploymentId, "deployment-2");
  assert.equal(deployment.extensionHandle, "judgeme-624");
  assert.equal(deployment.source, "discovered");
  assert.deepEqual(requests, [
    storefrontUrl,
    `${unrelatedBase}manifest.json`,
    `${judgeMeBase}manifest.json`,
  ]);

  const cached = await resolveJudgeMeV3AssetDeployment({
    shopDomain: "store.myshopify.com",
    storefrontUrl,
    requiredManifestEntries: [
      "reviews-grid-widget/main.js",
      "review-widget/main.js",
    ],
    fetch: mockFetch,
  });
  assert.equal(cached.source, "cache");
  assert.equal(requests.length, 3);
});

test("retries a forbidden storefront request with browser navigation headers", async () => {
  clearJudgeMeV3AssetDiscoveryCache();
  const storefrontUrl = "https://store.example/products/example";
  const judgeMeBase =
    "https://cdn.shopify.com/extensions/deployment-2/judgeme-624/assets/";
  const storefrontRequests = [];
  const mockFetch = async (input, init) => {
    const url = String(input);

    if (url === storefrontUrl) {
      storefrontRequests.push(new Headers(init?.headers));
      if (storefrontRequests.length === 1) {
        return new Response("forbidden", { status: 403 });
      }

      return new Response(`<script src="${judgeMeBase}loader.js"></script>`, {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    }

    if (url === `${judgeMeBase}manifest.json`) {
      return Response.json({
        "review-widget/main.js": { file: "review-widget.js" },
      });
    }

    throw new Error(`Unexpected request: ${url}`);
  };

  const deployment = await resolveJudgeMeV3AssetDeployment({
    shopDomain: "store.myshopify.com",
    storefrontUrl,
    requiredManifestEntries: ["review-widget/main.js"],
    fetch: mockFetch,
  });

  assert.equal(deployment.assetBaseUrl, judgeMeBase);
  assert.equal(deployment.source, "discovered");
  assert.equal(storefrontRequests.length, 2);
  assert.equal(storefrontRequests[0].get("user-agent"), null);
  assert.match(storefrontRequests[1].get("user-agent"), /^Mozilla\/5\.0/);
  assert.equal(
    storefrontRequests[1].get("accept-language"),
    "en-US,en;q=0.9",
  );
  assert.equal(
    storefrontRequests[1].get("upgrade-insecure-requests"),
    "1",
  );
});

test("uses a validated last-known deployment when storefront discovery fails", async () => {
  clearJudgeMeV3AssetDiscoveryCache();
  const fallbackAssetBaseUrl =
    "https://cdn.shopify.com/extensions/known-good/judgeme-624/assets";
  let requests = 0;
  const mockFetch = async () => {
    requests += 1;
    return new Response("rate limited", { status: 429 });
  };
  const deployment = await resolveJudgeMeV3AssetDeployment({
    shopDomain: "store.myshopify.com",
    fallbackAssetBaseUrl,
    fetch: mockFetch,
  });

  assert.equal(deployment.assetBaseUrl, `${fallbackAssetBaseUrl}/`);
  assert.equal(deployment.source, "fallback");
  assert.deepEqual(deployment.manifestEntries, []);

  const cachedFallback = await resolveJudgeMeV3AssetDeployment({
    shopDomain: "store.myshopify.com",
    fallbackAssetBaseUrl,
    fetch: mockFetch,
  });
  assert.equal(cachedFallback.source, "fallback");
  assert.equal(requests, 1);
});

test("rejects unsafe storefront discovery URLs", async () => {
  await assert.rejects(
    resolveJudgeMeV3AssetDeployment({
      shopDomain: "store.myshopify.com",
      storefrontUrl: "http://localhost:3000/internal",
      fetch: async () => new Response(""),
    }),
    (error) => error?.code === "invalid-storefront-url",
  );
});

test("runtime lifecycle suppresses stale readiness and disposes once", async () => {
  let finishInitialization;
  let disposeCalls = 0;
  const statuses = [];
  const container = { dataset: {} };
  const initialization = new Promise((resolve) => {
    finishInitialization = resolve;
  });
  const cleanup = startJudgeMeRuntime({
    assetBaseUrl:
      "https://cdn.shopify.com/extensions/deployment/judgeme-624/assets/",
    container,
    dispose: () => {
      disposeCalls += 1;
    },
    initialize: () => initialization,
    reportStatus: (event) => statuses.push(event),
    widget: "reviews-grid",
  });

  assert.equal(container.dataset.judgemeReactRuntimeStatus, "loading");
  assert.deepEqual(
    statuses.map(({ status }) => status),
    ["loading"],
  );

  cleanup();
  cleanup();
  finishInitialization();
  await initialization;
  await Promise.resolve();

  assert.equal(disposeCalls, 1);
  assert.deepEqual(
    statuses.map(({ status }) => status),
    ["loading"],
  );
});

test("runtime lifecycle reports missing deployment configuration", () => {
  const statuses = [];
  const container = { dataset: {} };
  let initialized = false;
  const cleanup = startJudgeMeRuntime({
    container,
    initialize: async () => {
      initialized = true;
    },
    reportStatus: (event) => statuses.push(event),
    widget: "review-widget",
  });

  assert.equal(container.dataset.judgemeReactRuntimeStatus, "error");
  assert.equal(initialized, false);
  assert.equal(statuses[0].status, "error");
  assert.equal(statuses[0].phase, "configuration");
  assert.match(statuses[0].error.message, /v3AssetBaseUrl/);
  cleanup();
});

test("carousel localization compares document and config languages case-insensitively", () => {
  assert.equal(shouldUpdateCarouselHeaderText("EN", "en"), false);
  assert.equal(shouldUpdateCarouselHeaderText("en-US", "EN"), false);
  assert.equal(shouldUpdateCarouselHeaderText("PT-BR", "pt"), false);
  assert.equal(shouldUpdateCarouselHeaderText("fr", "en"), true);
  assert.equal(shouldUpdateCarouselHeaderText("", "en"), true);
});

test("v3 overlay ownership removes Judge.me's hidden close-time replacement", () => {
  const timers = createManualTimers();
  let keyboardReleases = 0;
  const controller = createReviewWidgetV3OverlayController({
    ownerId: "test-owner",
    releaseKeyboardHandler: () => {
      keyboardReleases += 1;
    },
    scheduleTimer: timers.schedule,
    cancelTimer: timers.cancel,
  });
  const activeOverlay = createOverlayFixture("block");
  const hiddenReplacement = createOverlayFixture("none");

  controller.arm();
  assert.equal(controller.claimOverlay(activeOverlay), "claimed");
  controller.markOpened(activeOverlay);
  controller.beginClose(activeOverlay);
  activeOverlay.isConnected = false;
  controller.handleRemovedOverlay(activeOverlay);
  assert.equal(controller.claimOverlay(hiddenReplacement), "claimed");

  timers.flush();

  assert.equal(hiddenReplacement.removed, true);
  assert.equal(
    hiddenReplacement.attributes.get(
      "data-judgeme-react-review-widget-owner",
    ),
    "test-owner",
  );
  assert.equal(controller.owns(hiddenReplacement), false);
  assert.equal(keyboardReleases, 1);
});

test("v3 overlay ownership preserves an intentional visible reopen", () => {
  const timers = createManualTimers();
  let keyboardReleases = 0;
  const controller = createReviewWidgetV3OverlayController({
    ownerId: "test-owner",
    releaseKeyboardHandler: () => {
      keyboardReleases += 1;
    },
    scheduleTimer: timers.schedule,
    cancelTimer: timers.cancel,
  });
  const activeOverlay = createOverlayFixture("block");
  const visibleReplacement = createOverlayFixture("block");

  controller.arm();
  controller.claimOverlay(activeOverlay);
  controller.markOpened(activeOverlay);
  controller.beginClose(activeOverlay);
  activeOverlay.isConnected = false;
  controller.handleRemovedOverlay(activeOverlay);
  controller.claimOverlay(visibleReplacement);
  controller.markOpened(visibleReplacement);
  timers.flush();

  assert.equal(visibleReplacement.removed, false);
  assert.equal(controller.owns(visibleReplacement), true);
  assert.equal(keyboardReleases, 0);

  assert.equal(controller.dispose(), 1_200);
  assert.equal(visibleReplacement.removed, true);
  assert.equal(keyboardReleases, 1);
});

test("v3 overlay ownership removes a late modal after its root unmounts", () => {
  let keyboardReleases = 0;
  const controller = createReviewWidgetV3OverlayController({
    ownerId: "test-owner",
    releaseKeyboardHandler: () => {
      keyboardReleases += 1;
    },
  });
  const lateOverlay = createOverlayFixture("block");

  controller.arm();
  assert.equal(controller.dispose(), 11_000);
  assert.equal(controller.claimOverlay(lateOverlay), "removed");
  assert.equal(lateOverlay.removed, true);
  assert.equal(keyboardReleases, 1);
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
  const mockFetch = async function (input) {
    assert.equal(this, undefined);
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

test("fetches exact Judge.me Medals and shared resources in one cache read", async () => {
  const requestedUrls = [];
  const mockFetch = async function (input) {
    assert.equal(this, undefined);
    const url = new URL(input);
    requestedUrls.push(url);

    assert.equal(url.hostname, "cache.judge.me");
    assert.equal(url.pathname, "/widgets/shopify/store.myshopify.com");
    assert.equal(url.searchParams.get("public_token"), "public-token");
    assert.equal(url.searchParams.get("medals"), "1");
    assert.equal(url.searchParams.has("api_token"), false);

    return Response.json({
      html_miracle: "<style>.jdgm-medals{display:flex}</style>",
      medals: createMedalsMarkup(),
      settings:
        '<script class="jdgm-settings-script">window.jdgmSettings={"medals_widget_use_monochromatic_version":true,"medals_widget_elements_color":"#108474"};</script><style>.jdgm-widget{box-sizing:border-box}</style>',
    });
  };

  const data = await fetchJudgeMeMedals({
    shopDomain: "store.myshopify.com",
    publicToken: "public-token",
    fetch: mockFetch,
  });

  assert.equal(requestedUrls.length, 1);
  assert.ok(data);
  assert.equal(data.medalCount, 2);
  assert.equal(data.rating, "4.78");
  assert.equal(data.verifiedReviewCount, 866);
  assert.match(data.html, /jdgm-medals-wrapper/);
  assert.equal(data.settings.medals_widget_use_monochromatic_version, true);
  assert.match(data.styles, /box-sizing:border-box/);
  assert.match(data.styles, /display:flex/);
});

test("returns null when Judge.me has no earned Medals", async () => {
  const data = await fetchJudgeMeMedals({
    shopDomain: "store.myshopify.com",
    publicToken: "public-token",
    fetch: async () =>
      Response.json({
        html_miracle: "",
        medals: null,
        settings:
          '<script class="jdgm-settings-script">window.jdgmSettings={};</script>',
      }),
  });

  assert.equal(data, null);
});

test("fetches exact UGC Media Grid cache markup and wraps its Liquid shell", async () => {
  const requestedUrls = [];
  const data = await fetchUgcMediaGrid({
    shopDomain: "store.myshopify.com",
    publicToken: "public-token",
    fetch: async function (input) {
      assert.equal(this, undefined);
      const url = new URL(input);
      requestedUrls.push(url);
      assert.equal(url.hostname, "cache.judge.me");
      assert.equal(url.searchParams.get("ugc_media_grid"), "1");
      assert.equal(url.searchParams.has("medals"), false);

      return Response.json({
        html_miracle: "<style>.jdgm-ugc-media{display:grid}</style>",
        settings:
          '<script class="jdgm-settings-script">window.jdgmSettings={"widget_ugc_title":"From our community"};</script>',
        ugc_media_grid: createUgcMediaGridMarkup({ includeWrapper: false }),
      });
    },
  });

  assert.equal(requestedUrls.length, 1);
  assert.ok(data);
  assert.equal(data.source, "cache");
  assert.equal(data.postCount, 2);
  assert.equal(data.perPage, 6);
  assert.match(data.html, /jdgm-widget jdgm-ugc-media-wrapper/);
  assert.equal(data.settings.widget_ugc_title, "From our community");
  assert.match(data.styles, /display:grid/);
});

test("falls back to Judge.me's tokenless UGC social-post feed", async () => {
  const requestedUrls = [];
  const data = await fetchUgcMediaGrid({
    shopDomain: "store.myshopify.com",
    publicToken: "public-token",
    perPage: 4,
    fetch: async (input) => {
      const url = new URL(input);
      requestedUrls.push(url);

      if (url.hostname === "cache.judge.me") {
        return Response.json({
          html_miracle: "",
          settings:
            '<script class="jdgm-settings-script">window.jdgmSettings={};</script>',
        });
      }

      assert.equal(url.hostname, "api.judge.me");
      assert.equal(url.pathname, "/reviews/social_posts");
      assert.equal(url.searchParams.get("shop_domain"), "store.myshopify.com");
      assert.equal(url.searchParams.get("url"), "store.myshopify.com");
      assert.equal(url.searchParams.get("platform"), "shopify");
      assert.equal(url.searchParams.get("per_page"), "4");
      assert.equal(url.searchParams.get("page"), "1");
      assert.equal(url.searchParams.has("api_token"), false);
      assert.equal(url.searchParams.has("public_token"), false);
      return Response.json({
        page: 1,
        per_page: "4",
        posts: [...createUgcPosts(), { id: "broken-post" }],
      });
    },
  });

  assert.equal(requestedUrls.length, 2);
  assert.ok(data);
  assert.equal(data.source, "social-posts-fallback");
  assert.equal(data.postCount, 2);
  assert.equal(data.perPage, 4);
  assert.match(data.html, /jdgm-ugc-media-data/);
  assert.match(data.html, /&quot;media_type&quot;:&quot;IMAGE&quot;/);
});

test("returns null when UGC Media Grid has no published posts", async () => {
  const data = await fetchUgcMediaGrid({
    shopDomain: "store.myshopify.com",
    publicToken: "public-token",
    fetch: async (input) => {
      const url = new URL(input);
      return url.hostname === "cache.judge.me"
        ? Response.json({
            html_miracle: "",
            settings:
              '<script class="jdgm-settings-script">window.jdgmSettings={};</script>',
          })
        : new Response("null", { status: 404 });
    },
  });

  assert.equal(data, null);
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
    const endpoint =
      url.hostname === "cache.judge.me"
        ? "medals_cache"
        : url.pathname.split("/").pop();
    requestedEndpoints.push(endpoint);

    if (endpoint === "medals_cache") {
      assert.equal(url.pathname, "/widgets/shopify/store.myshopify.com");
      assert.equal(url.searchParams.get("public_token"), "public-token");
      assert.equal(url.searchParams.get("medals"), "1");
      assert.equal(url.searchParams.get("ugc_media_grid"), "1");
      return Response.json({
        html_miracle: "",
        medals: createMedalsMarkup(),
        settings:
          "<script class='jdgm-settings-script'>window.jdgmSettings={};</script><style>.jdgm-widget{color:teal}</style>",
        ugc_media_grid: createUgcMediaGridMarkup({ includeWrapper: false }),
      });
    }

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

    throw new Error(`Unexpected endpoint: ${endpoint}`);
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
    "medals_cache",
    "preview_badge",
    "product_review",
    "reviews_tab",
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
  assert.equal(data.medals?.medalCount, 2);
  assert.equal(data.medals?.verifiedReviewCount, 866);
  assert.equal(data.ugcMediaGrid?.postCount, 2);
  assert.equal(data.ugcMediaGrid?.source, "cache");
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

test("keeps healthy legacy widgets when one endpoint and shared settings fail", async () => {
  const requestedEndpoints = [];
  const mockFetch = async (input) => {
    const url = new URL(input);
    const endpoint =
      url.hostname === "cache.judge.me"
        ? "storefront_cache"
        : url.pathname.split("/").pop();
    requestedEndpoints.push(endpoint);

    if (endpoint === "storefront_cache") {
      return Response.json({
        html_miracle: "<style>.from-cache{display:block}</style>",
        settings: "not valid settings markup",
      });
    }
    if (endpoint === "settings") {
      return Response.json({ settings: "still not valid settings markup" });
    }
    if (endpoint === "html_miracle") {
      return Response.json({
        html_miracle: "<style>.from-fallback{display:block}</style>",
      });
    }
    if (endpoint === "product_review") {
      return new Response("unavailable", { status: 503 });
    }
    if (endpoint === "preview_badge") {
      return Response.json({
        product_external_id: 12345,
        badge: "<div class='jdgm-prev-badge'>Five stars</div>",
      });
    }
    if (endpoint === "featured_carousel") {
      return Response.json({
        featured_carousel:
          "<section class='jdgm-widget jdgm-carousel'>Healthy carousel</section>",
      });
    }
    if (endpoint === "reviews_tab") {
      return Response.json({ page: 1, reviews_tab: null });
    }
    if (endpoint === "verified_badge") {
      return Response.json({ verified_badge: null });
    }
    if (endpoint === "all_reviews_page") {
      return Response.json({
        all_reviews:
          "<article class='jdgm-rev' data-review-id='healthy'>Review</article>",
        all_reviews_header:
          "<div class='jdgm-all-reviews__header' data-number-of-reviews='1' data-average-rating='5' data-number-of-product-reviews='1' data-number-of-shop-reviews='0' data-per-page='25'></div>",
      });
    }
    if (url.hostname === "api.judge.me") {
      return new Response("missing", { status: 404 });
    }

    throw new Error(`Unexpected endpoint: ${endpoint}`);
  };

  const data = await fetchLegacyStorefrontWidgets({
    shopDomain: "store.myshopify.com",
    publicToken: "public-token",
    productId: "12345",
    fetch: mockFetch,
  });

  assert.equal(data.reviewWidget, null);
  assert.equal(data.starRatingBadge?.productId, "12345");
  assert.match(data.reviewsCarousel?.html ?? "", /Healthy carousel/);
  assert.equal(data.allReviewsCounter?.count, 1);
  assert.match(data.allReviewsWidget?.html ?? "", /data-review-id='healthy'/);
  assert.equal(data.floatingReviewsTab?.source, "all-reviews-page-fallback");
  assert.equal(data.resources.settings.review_widget_revamp_enabled, false);
  assert.match(data.resources.styles, /from-cache/);
  assert.match(data.resources.styles, /from-fallback/);
  assert.ok(requestedEndpoints.includes("settings"));
  assert.ok(requestedEndpoints.includes("html_miracle"));
});

function createMedalsMarkup() {
  return [
    '<div class="jdgm-medals-wrapper jdgm-hidden jdgm-widget">',
    '<div class="jdgm-medals" data-link="https://app.judge.me/reviews/stores/example">',
    '<div class="jdgm-medals__container">',
    '<div class="jdgm-medal-wrapper"><a class="jdgm-medal jdgm--loading"><div class="jdgm-medal__image" data-url="auth/platinum.svg"></div></a></div>',
    '<div class="jdgm-medal-wrapper"><a class="jdgm-medal jdgm--loading"><div class="jdgm-medal__image" data-url="ver_rev/platinum.svg"></div><div class="jdgm-medal__value">866</div></a></div>',
    "</div></div>",
    '<div class="jdgm-verified-wrapper"><div class="jdgm-rating">',
    '<span class="jdgm-rating__stars" data-score="4.78"></span>',
    '<span class="jdgm-rating__count" data-value="866"></span>',
    '</div><div class="jdgm-verified-by"><span class="jdgm-verified-by__text"></span><span class="jdgm-verified-by__image"></span></div></div>',
    "</div>",
  ].join("");
}

function createUgcPosts() {
  return [
    {
      id: "post-1",
      username: "community_one",
      timestamp: "Today",
      html_safe_caption: "A customer photo",
      media_type: "IMAGE",
      media_url: "https://judgeme.imgix.net/example/photo-one.jpg",
      thumbnail_url: "https://judgeme.imgix.net/example/thumb-one.jpg",
      products: [],
    },
    {
      id: "post-2",
      username: "community_two",
      timestamp: "Yesterday",
      html_safe_caption: "A customer video",
      media_type: "VIDEO",
      media_url: "https://judgeme.imgix.net/example/video-two.mp4",
      thumbnail_url: "https://judgeme.imgix.net/example/thumb-two.jpg",
      products: [],
    },
  ];
}

function createUgcMediaGridMarkup({ includeWrapper = true } = {}) {
  const serializedPosts = JSON.stringify(createUgcPosts())
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  const grid = [
    '<div class="jdgm-ugc-media" data-per-page="6">',
    '<div class="jdgm-ugc-media-data jdgm-hidden" data-json="',
    serializedPosts,
    '"></div></div>',
  ].join("");

  return includeWrapper
    ? `<div class="jdgm-widget jdgm-ugc-media-wrapper">${grid}</div>`
    : grid;
}

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

test("reads the AI Reviews Summary metafield with a server-only Admin token", async () => {
  const metafieldValue = JSON.stringify({
    average_rating: 4.8,
    number_of_reviews: 867,
    ai_summary_text: "Customers praise the print quality.",
  });
  const value = await fetchAiReviewsSummaryMetafield({
    adminAccessToken: "admin-token",
    apiVersion: "2026-04",
    shopDomain: "https://STORE.myshopify.com/products/example",
    fetch: async (input, init) => {
      const url = new URL(input);
      assert.equal(url.origin, "https://store.myshopify.com");
      assert.equal(url.pathname, "/admin/api/2026-04/graphql.json");
      assert.equal(init?.method, "POST");
      assert.equal(init?.headers["X-Shopify-Access-Token"], "admin-token");
      assert.match(JSON.parse(init?.body).query, /store_summary_widget_data/);
      return Response.json({
        data: { shop: { summary: { value: metafieldValue } } },
      });
    },
  });

  assert.equal(value, metafieldValue);
  await assert.rejects(
    fetchAiReviewsSummaryMetafield({
      adminAccessToken: "admin-token",
      apiVersion: "unstable",
      shopDomain: "store.myshopify.com",
      fetch: async () => {
        throw new Error("should not fetch");
      },
    }),
    /stable Shopify Admin API version/,
  );
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
  assert.equal(data.page.sourceUrl, data.page.requestUrl);
});

test("falls back to the public carousel feed and preserves the snippets runtime URL", async () => {
  const requests = [];
  const page = await fetchReviewSnippetsPage({
    shopDomain: "https://STORE.myshopify.com/products/example",
    config: {
      reviewSelection: "all",
      maxReviews: 2,
      minStarRating: "4",
    },
    fetch: async (input, init) => {
      const url = new URL(input);
      requests.push(url);
      assert.equal(url.searchParams.has("api_token"), false);
      assert.equal(init?.headers.Accept, "application/json");

      if (url.origin === "https://api.judge.me") {
        assert.equal(
          url.pathname,
          "/reviews/reviews_for_review_snippet_widget",
        );
        assert.equal(url.searchParams.get("selection_source"), "all");
        assert.equal(url.searchParams.get("count"), "2");
        assert.equal(url.searchParams.get("min_star_rating"), "4");
        return new Response(null, { status: 404 });
      }

      assert.equal(url.origin, "https://cdn.judge.me");
      assert.equal(url.pathname, "/reviews/reviews_for_carousel");
      assert.equal(url.searchParams.get("reviews_selection"), "all");
      assert.equal(url.searchParams.get("carousel_type"), "cards");
      assert.equal(url.searchParams.get("star_rating"), "4_to_5_star");
      assert.equal(url.searchParams.get("max_reviews"), "2");
      assert.equal(url.searchParams.get("shop_domain"), "store.myshopify.com");
      assert.equal(url.searchParams.get("platform"), "shopify");

      return Response.json({
        reviews: [
          {
            uuid: "fallback-review-1",
            rating: 5,
            reviewer_name: "Public Customer",
            body_html: "<p>Excellent print.</p>",
            verified_buyer: true,
            product_title: "Moon Print",
            product_variant_title: "Large",
            picture: {
              urls: {
                small: "https://judgeme.imgix.net/review-small.jpg",
              },
            },
          },
          {
            uuid: "below-minimum",
            rating: 3,
            reviewer_name: "Filtered Customer",
            body_html: "<p>Filtered.</p>",
          },
          {
            uuid: "fallback-review-2",
            rating: 4,
            reviewer_name: "Second Customer",
            body: "Useful & safe <review>.",
            verified_buyer: false,
            product_title_localized: "Localized Print",
            product_variant_title: "",
            pictures_urls: [
              {
                original: "https://judgeme.imgix.net/review-original.jpg",
              },
            ],
          },
          {
            uuid: "over-count-limit",
            rating: 5,
            reviewer_name: "Third Customer",
            body_html: "<p>Not serialized.</p>",
          },
        ],
      });
    },
  });

  assert.equal(requests.length, 2);
  assert.equal(
    new URL(page.requestUrl).origin,
    "https://api.judge.me",
  );
  assert.equal(new URL(page.sourceUrl).origin, "https://cdn.judge.me");
  assert.equal(page.reviews.length, 2);
  assert.deepEqual(page.reviews[0], {
    uuid: "fallback-review-1",
    rating: 5,
    body_html: "<p>Excellent print.</p>",
    public_reviewer_name: "Public Customer",
    verified_buyer: true,
    product_name: "Moon Print",
    product_variant_title: "Large",
    review_image_url: "https://judgeme.imgix.net/review-small.jpg",
  });
  assert.equal(
    page.reviews[1].body_html,
    "<p>Useful &amp; safe &lt;review&gt;.</p>",
  );
  assert.equal(page.reviews[1].rating, 4);
  assert.equal(page.reviews[1].product_name, "Localized Print");
  assert.equal(
    page.reviews[1].review_image_url,
    "https://judgeme.imgix.net/review-original.jpg",
  );

  const data = createReviewSnippetsData({
    config: {
      reviewSelection: "all",
      maxReviews: 2,
      minStarRating: "4",
    },
    page,
    settings: { locale: "en" },
    shopDomain: "store.myshopify.com",
  });
  const preloaded = createReviewSnippetsPreloadedResponse(data);
  const preloadedPayload = JSON.parse(preloaded.payload);

  assert.equal(preloaded.requestKey, canonicalizeUrlForTest(page.requestUrl));
  assert.notEqual(preloaded.requestKey, canonicalizeUrlForTest(page.sourceUrl));
  assert.deepEqual(preloadedPayload.reviews, page.reviews);
  assert.deepEqual(preloadedPayload.settings, page.settings);
});

test("propagates Review Snippets fallback aborts without wrapping them", async () => {
  const controller = new AbortController();
  const abortError = new DOMException("stop fallback", "AbortError");
  let requestCount = 0;

  await assert.rejects(
    fetchReviewSnippetsPage({
      shopDomain: "store.myshopify.com",
      signal: controller.signal,
      fetch: async (_input, init) => {
        requestCount += 1;
        assert.equal(init?.signal, controller.signal);
        if (requestCount === 1) return new Response(null, { status: 404 });
        controller.abort(abortError);
        throw abortError;
      },
    }),
    (error) => error === abortError,
  );
  assert.equal(requestCount, 2);
});

test("reports both public Review Snippets sources when neither is available", async () => {
  let requestCount = 0;
  await assert.rejects(
    fetchReviewSnippetsPage({
      shopDomain: "store.myshopify.com",
      config: { reviewSelection: "all" },
      fetch: async (input) => {
        requestCount += 1;
        const url = new URL(input);
        assert.equal(url.searchParams.has("api_token"), false);
        return new Response(null, {
          status: url.origin === "https://api.judge.me" ? 404 : 503,
        });
      },
    }),
    /Primary: Review Snippets request failed with HTTP 404\. Fallback: Review Snippets public carousel fallback request failed with HTTP 503\./,
  );
  assert.equal(requestCount, 2);
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

test("drops malformed collection rows and defaults optional response fields", async () => {
  const validReview = {
    uuid: "valid-review",
    rating: 5,
    body_html: "<p>Still useful.</p>",
    public_reviewer_name: "Customer",
    card_type: "photo",
  };
  const malformedReviews = [
    validReview,
    null,
    { uuid: "", rating: 5, body_html: "<p>Missing ID.</p>" },
    { uuid: "bad-rating", rating: 9, body_html: "<p>Bad rating.</p>" },
  ];

  const [cards, testimonials, videos, grid, snippets, happy, reviewWidget, qna] =
    await Promise.all([
      fetchCardsCarouselPage({
        shopDomain: "store.myshopify.com",
        fetch: async () => Response.json({ reviews: malformedReviews }),
      }),
      fetchTestimonialsCarouselPage({
        shopDomain: "store.myshopify.com",
        fetch: async () => Response.json({ reviews: malformedReviews }),
      }),
      fetchVideosCarouselPage({
        shopDomain: "store.myshopify.com",
        config: { reviewType: "photos-and-videos" },
        fetch: async () => Response.json({ reviews: malformedReviews }),
      }),
      fetchReviewsGridPage({
        shopDomain: "store.myshopify.com",
        fetch: async () =>
          Response.json({
            current_page: "invalid",
            per_page: 0,
            review_selection: "all",
            reviews: malformedReviews,
            total_count: "invalid",
            total_pages: -1,
          }),
      }),
      fetchReviewSnippetsPage({
        shopDomain: "store.myshopify.com",
        fetch: async () =>
          Response.json({ reviews: malformedReviews, settings: "invalid" }),
      }),
      fetchHappyCustomersPage({
        shopDomain: "store.myshopify.com",
        fetch: async () =>
          Response.json({
            reviews: malformedReviews,
            pagination: {
              current_page: "invalid",
              per_page: 0,
              total_count: "invalid",
              total_pages: -1,
            },
            primary_language_reviews: "invalid",
            other_language_reviews: null,
            number_of_product_reviews: "invalid",
            number_of_shop_reviews: -1,
            custom_form_filters_and_averages: undefined,
          }),
      }),
      fetchReviewWidgetV3Page({
        shopDomain: "store.myshopify.com",
        productId: "12345",
        fetch: async () =>
          Response.json({
            average_rating: "invalid",
            number_of_reviews: "invalid",
            number_of_questions: -1,
            reviews: malformedReviews,
            pagination: {
              current_page: "invalid",
              per_page: 0,
              total_pages: -1,
            },
          }),
      }),
      fetchQuestionsAndAnswersPage({
        shopDomain: "store.myshopify.com",
        productId: "12345",
        fetch: async () =>
          Response.json({
            current_page: "invalid",
            total_pages: 0,
            per_page: "invalid",
            questions: [
              {
                uuid: "question-1",
                content_html: "<p>A valid question?</p>",
                created_at: "2026-07-14T10:00:00.000Z",
                asker_name: "Customer",
                answers: [
                  {
                    uuid: "answer-1",
                    content_html: "<p>Yes.</p>",
                    created_at: "2026-07-14T11:00:00.000Z",
                    answerer_name: "Store",
                  },
                  { uuid: "broken-answer" },
                ],
              },
              { uuid: "broken-question" },
            ],
          }),
      }),
    ]);

  assert.deepEqual(cards.reviews.map(({ uuid }) => uuid), ["valid-review"]);
  assert.deepEqual(testimonials.reviews.map(({ uuid }) => uuid), [
    "valid-review",
  ]);
  assert.deepEqual(videos.reviews.map(({ uuid }) => uuid), ["valid-review"]);
  assert.deepEqual(grid.reviews.map(({ uuid }) => uuid), ["valid-review"]);
  assert.deepEqual(
    [grid.currentPage, grid.perPage, grid.totalCount, grid.totalPages],
    [1, 1, 1, 1],
  );
  assert.deepEqual(snippets.reviews.map(({ uuid }) => uuid), [
    "valid-review",
  ]);
  assert.deepEqual(snippets.settings, {});
  assert.deepEqual(happy.reviews.map(({ uuid }) => uuid), ["valid-review"]);
  assert.equal(happy.pagination.totalCount, 1);
  assert.equal(happy.numberOfProductReviews, 1);
  assert.equal(happy.numberOfShopReviews, 0);
  assert.deepEqual(reviewWidget.reviews.map(({ uuid }) => uuid), [
    "valid-review",
  ]);
  assert.deepEqual(
    reviewWidget.payload.reviews.map(({ uuid }) => uuid),
    ["valid-review"],
  );
  assert.equal(reviewWidget.averageRating, 5);
  assert.equal(reviewWidget.numberOfReviews, 1);
  assert.equal(reviewWidget.numberOfQuestions, 0);
  assert.equal(qna.currentPage, 1);
  assert.equal(qna.totalPages, 1);
  assert.equal(qna.perPage, 1);
  assert.equal(qna.questions.length, 1);
  assert.equal(qna.questions[0].answers.length, 1);

  await assert.rejects(
    fetchCardsCarouselPage({
      shopDomain: "store.myshopify.com",
      fetch: async () =>
        Response.json({
          reviews: [
            {
              uuid: "unsafe-review",
              rating: 5,
              body_html: '<img src="x" onerror="alert(1)">',
            },
          ],
        }),
    }),
    /executable Cards Carousel markup/,
  );
});

test("standalone exact widgets survive unavailable shared legacy resources", async () => {
  const cards = await fetchCardsCarousel({
    shopDomain: "store.myshopify.com",
    publicToken: "public-token",
    fetch: async (input) => {
      const url = new URL(input);
      if (url.hostname === "cdn.judge.me") {
        return Response.json({
          reviews: [
            {
              uuid: "card-1",
              rating: 5,
              body_html: "<p>Good.</p>",
            },
          ],
        });
      }
      return new Response("unavailable", { status: 503 });
    },
  });

  assert.deepEqual(cards.aggregate, { count: 1, rating: 5 });
  assert.deepEqual(cards.settings, {});
  assert.equal(cards.page.reviews.length, 1);

  const reviewWidget = await fetchReviewWidgetV3({
    shopDomain: "store.myshopify.com",
    publicToken: "public-token",
    productId: "12345",
    productHandle: "poster",
    productTitle: "Poster",
    fetch: async (input) => {
      const url = new URL(input);
      if (url.pathname === "/reviews/reviews_for_widget") {
        return Response.json(createReviewWidgetV3Fixture());
      }
      return new Response("unavailable", { status: 503 });
    },
  });

  assert.ok(reviewWidget);
  assert.deepEqual(reviewWidget.shopAggregate, { count: 15, rating: 4.8 });
  assert.deepEqual(reviewWidget.settings, {});
  assert.equal(reviewWidget.shopReviewsCount, 0);
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

test("reads Trust Badge metafields through the server-only Shopify Admin API", async () => {
  assert.equal(typeof TrustBadge, "function");
  const metafields = await fetchTrustBadgeMetafields({
    adminAccessToken: " private-admin-token ",
    apiVersion: "2026-04",
    shopDomain: "https://STORE.myshopify.com/products/example",
    fetch: async function (input, init) {
      assert.equal(this, undefined);
      const url = new URL(input);
      assert.equal(
        url.href,
        "https://store.myshopify.com/admin/api/2026-04/graphql.json",
      );
      assert.equal(url.href.includes("private-admin-token"), false);
      assert.equal(init?.method, "POST");
      assert.equal(
        init?.headers["X-Shopify-Access-Token"],
        "private-admin-token",
      );
      const request = JSON.parse(init?.body);
      assert.match(request.query, /trust_badge\.modal_data/);

      return Response.json({
        data: {
          shop: {
            enabled: { value: "true" },
            structure: { value: "outline" },
            color: { value: "black" },
            star: { value: "brand" },
            verifiedReviewsCount: { value: "42" },
            verifiedAverageRating: { value: "4.8" },
            totalReviewsCount: { value: "45" },
            modalData: {
              value: JSON.stringify(createTrustBadgeModalFixture()),
            },
          },
        },
      });
    },
  });

  assert.deepEqual(metafields, {
    color: "black",
    enabled: "true",
    modalData: JSON.stringify(createTrustBadgeModalFixture()),
    star: "brand",
    structure: "outline",
    totalReviewsCount: "45",
    verifiedAverageRating: "4.8",
    verifiedReviewsCount: "42",
  });
});

test("sanitizes Trust Badge data and supports an explicit disabled preview", () => {
  const modalData = JSON.stringify({
    ...createTrustBadgeModalFixture(),
    features: [{ label: "Fast shipping" }],
    photo_gallery: [
      {
        reviewer_name: "Private Customer",
        body_html: "<p>Private review body</p>",
      },
    ],
    transparency_score: 98,
  });
  const metafields = {
    color: "black",
    enabled: "false",
    modalData,
    star: "brand",
    structure: "outline",
    totalReviewsCount: "45",
    verifiedAverageRating: "4.8",
    verifiedReviewsCount: "42",
  };
  const settings = { locale: "en" };

  assert.equal(
    createTrustBadgeData({
      metafields,
      settings,
      shopDomain: "store.myshopify.com",
    }),
    null,
  );

  const data = createTrustBadgeData({
    metafields,
    previewWhenDisabled: true,
    config: { alignment: "center", color: "white" },
    settings,
    shopDomain: "store.myshopify.com",
  });
  assert.equal(data.enabled, false);
  assert.equal(data.source, "disabled-preview");
  assert.deepEqual(data.badge, {
    isCertified: true,
    totalReviewsCount: 45,
    verifiedAverageRating: 4.8,
    verifiedReviewsCount: 42,
  });
  assert.deepEqual(data.config, {
    alignment: "center",
    color: "white",
    star: "default",
    structure: "default",
  });
  assert.deepEqual(data.modal, {
    aiSummary: { lastUpdated: "2026-07-14", text: "Customers love it." },
    averageRating: 4.7,
    isCertified: true,
    memberSince: "January 2024",
    ratingDistribution: {
      "1_star": 1,
      "2_star": 1,
      "3_star": 2,
      "4_star": 6,
      "5_star": 35,
    },
    sentimentTags: [{ name: "Quality", sentiment: "positive" }],
    shopLogoUrl: "https://cdn.shopify.com/example-logo.png",
    shopName: "Fixture Store",
    totalReviewsCount: 45,
    verifiedReviewsCount: 42,
  });
  assert.equal("photoGallery" in data.modal, false);

  const withoutAiSummary = createTrustBadgeData({
    metafields: {
      ...metafields,
      enabled: "true",
      modalData: JSON.stringify({
        ...createTrustBadgeModalFixture(),
        ai_summary: {},
      }),
    },
    settings,
    shopDomain: "store.myshopify.com",
  });
  assert.equal(withoutAiSummary.modal.aiSummary, null);
});

test("validates Trust Badge theme controls and eligibility", () => {
  assert.throws(
    () => normalizeTrustBadgeConfig({ alignment: "middle" }),
    /alignment is invalid/,
  );

  const modalData = JSON.stringify(createTrustBadgeModalFixture());
  assert.equal(
    createTrustBadgeData({
      metafields: {
        color: "black",
        enabled: "true",
        modalData,
        star: "brand",
        structure: "outline",
        totalReviewsCount: "45",
        verifiedAverageRating: "0",
        verifiedReviewsCount: "0",
      },
      settings: {},
      shopDomain: "store.myshopify.com",
    }),
    null,
  );

  assert.throws(
    () =>
      createTrustBadgeData({
        metafields: {
          color: "black",
          enabled: "true",
          modalData,
          star: "black",
          structure: "filled",
          totalReviewsCount: "45",
          verifiedAverageRating: "4.8",
          verifiedReviewsCount: "42",
        },
        settings: {},
        shopDomain: "store.myshopify.com",
      }),
    /filled color and star color must differ/,
  );
});

test("fetches the Happy Customers initial page from the tokenless CDN", async () => {
  assert.equal(typeof HappyCustomers, "function");
  const data = await fetchHappyCustomersPage({
    shopDomain: "https://STORE.myshopify.com/products/example",
    fetch: async function (input, init) {
      assert.equal(this, undefined);
      const url = new URL(input);
      assert.equal(url.origin, "https://cdn.judge.me");
      assert.equal(url.pathname, "/reviews/all_reviews_js_based");
      assert.equal(url.searchParams.get("shop_domain"), "store.myshopify.com");
      assert.equal(url.searchParams.get("platform"), "shopify");
      assert.equal(
        url.searchParams.get("widget_type"),
        "all-reviews-widget-v2025",
      );
      assert.equal(url.searchParams.get("page"), "1");
      assert.equal(url.searchParams.has("review_type"), false);
      assert.equal(url.searchParams.has("api_token"), false);
      assert.deepEqual(init?.headers, { Accept: "application/json" });
      return Response.json(createHappyCustomersApiFixture());
    },
  });

  assert.equal(data.reviewType, "product-reviews");
  assert.equal(data.reviews.length, 0);
  assert.equal(data.primaryLanguageReviews.length, 1);
  assert.equal(data.primaryLanguage, "en");
  assert.equal(data.pagination.totalCount, 12);
  assert.equal(data.numberOfProductReviews, 9);
  assert.equal(data.numberOfShopReviews, 3);
});

test("builds Happy Customers fallback data and gates its disabled preview", async () => {
  const page = await fetchHappyCustomersPage({
    config: { showFirst: "store" },
    shopDomain: "store.myshopify.com",
    fetch: async (input) => {
      const url = new URL(input);
      assert.equal(url.searchParams.get("review_type"), "shop-reviews");
      return Response.json(createHappyCustomersApiFixture());
    },
  });
  const legacyHtml = [
    "<div class='jdgm-all-reviews__header' data-number-of-reviews='12' data-average-rating='4.75'></div>",
    "<div class='jdgm-histogram__row' data-rating='5' data-frequency='9' data-percentage='75'></div>",
    "<div class='jdgm-histogram__row' data-rating='4' data-frequency='3'></div>",
  ].join("");
  const common = {
    aggregate: { count: 12, rating: 4.75 },
    config: { showFirst: "store" },
    legacyHtml,
    page,
    settings: { all_reviews_widget_v2025_enabled: false },
    shopDomain: "store.myshopify.com",
  };

  assert.equal(createHappyCustomersData(common), null);
  const data = createHappyCustomersData({
    ...common,
    previewWhenDisabled: true,
  });
  assert.equal(data.enabled, false);
  assert.equal(data.source, "disabled-preview");
  assert.equal(data.config.maxWidth, 1200);
  assert.deepEqual(data.histogram, [
    { frequency: 9, percentage: 75, rating: 5 },
    { frequency: 3, percentage: 25, rating: 4 },
    { frequency: 0, percentage: 0, rating: 3 },
    { frequency: 0, percentage: 0, rating: 2 },
    { frequency: 0, percentage: 0, rating: 1 },
  ]);
});

test("validates Happy Customers settings and public review markup", async () => {
  assert.throws(
    () => normalizeHappyCustomersConfig({ maxWidth: 1201 }),
    /between 200 and 1200/,
  );
  assert.throws(
    () => normalizeHappyCustomersConfig({ reviewSource: "collection" }),
    /review source is invalid/,
  );

  await assert.rejects(
    fetchHappyCustomersPage({
      shopDomain: "store.myshopify.com",
      fetch: async () =>
        Response.json({
          ...createHappyCustomersApiFixture(),
          primary_language_reviews: [
            {
              uuid: "unsafe-review",
              rating: 5,
              body_html: '<img src="x" onerror="alert(1)">',
            },
          ],
        }),
    }),
    /executable Happy Customers markup/,
  );
});

test("fetches the new Review Widget page from Judge.me's tokenless CDN", async () => {
  assert.equal(typeof ReviewWidgetV3, "function");
  const data = await fetchReviewWidgetV3Page({
    shopDomain: "https://STORE.myshopify.com/products/example",
    productId: "gid://shopify/Product/12345",
    fetch: async function (input, init) {
      assert.equal(this, undefined);
      const url = new URL(input);
      assert.equal(url.origin, "https://cdn.judge.me");
      assert.equal(url.pathname, "/reviews/reviews_for_widget");
      assert.equal(url.searchParams.get("shop_domain"), "store.myshopify.com");
      assert.equal(url.searchParams.get("platform"), "shopify");
      assert.equal(url.searchParams.get("product_id"), "12345");
      assert.equal(url.searchParams.get("page"), "1");
      assert.equal(url.searchParams.has("api_token"), false);
      assert.deepEqual(init?.headers, { Accept: "application/json" });
      return Response.json(createReviewWidgetV3Fixture());
    },
  });

  assert.equal(data.source, "cdn");
  assert.equal(data.averageRating, 4.8);
  assert.equal(data.numberOfReviews, 15);
  assert.equal(data.reviews.length, 1);
  assert.deepEqual(data.pagination, {
    currentPage: 1,
    perPage: 5,
    totalPages: 1,
  });
});

test("normalizes multilingual Review Widget data and sanitizes its payload", async () => {
  const fixture = createReviewWidgetV3Fixture();
  delete fixture.pagination;
  fixture.reviews = [];
  fixture.primary_language = "en";
  fixture.primary_language_reviews = [
    {
      uuid: "primary-review",
      rating: 5,
      body_html: "<p>Excellent.</p>",
    },
  ];
  fixture.primary_language_pagination = {
    current_page: 1,
    per_page: 5,
    total_pages: 65,
  };
  fixture.other_language_reviews = [
    {
      uuid: "other-review",
      rating: 4,
      body_html: "<p>Vrlo dobro.</p>",
    },
  ];
  fixture.other_language_pagination = {
    current_page: 1,
    per_page: 3,
    total_pages: 4,
  };

  const data = await fetchReviewWidgetV3Page({
    shopDomain: "store.myshopify.com",
    productId: "12345",
    fetch: async () => Response.json(fixture),
  });

  assert.equal(data.source, "cdn");
  assert.equal(data.primaryLanguage, "en");
  assert.deepEqual(data.payload.reviews, []);
  assert.deepEqual(
    data.reviews.map(({ uuid }) => uuid),
    ["primary-review", "other-review"],
  );
  assert.deepEqual(data.primaryLanguagePagination, {
    currentPage: 1,
    perPage: 5,
    totalPages: 65,
  });
  assert.deepEqual(data.otherLanguagePagination, {
    currentPage: 1,
    perPage: 3,
    totalPages: 4,
  });
  assert.deepEqual(data.pagination, data.primaryLanguagePagination);
});

test("gates the disabled v3 widget and uses Judge.me's explicit sample preview", async () => {
  const requested = [];
  const fetch = async (input) => {
    const url = new URL(input);
    requested.push(`${url.origin}${url.pathname}`);
    if (url.origin === "https://cdn.judge.me") {
      return Response.json({ html: "<div class='jdgm-rev'>Legacy</div>" });
    }

    assert.equal(url.origin, "https://api.judge.me");
    assert.equal(url.pathname, "/reviews/sample_review_widget_data");
    assert.equal(url.searchParams.get("review_type"), "product");
    return Response.json(createReviewWidgetV3Fixture());
  };
  const common = {
    shopDomain: "store.myshopify.com",
    productId: "12345",
    fetch,
  };

  assert.equal(await fetchReviewWidgetV3Page(common), null);
  const page = await fetchReviewWidgetV3Page({
    ...common,
    previewWhenDisabled: true,
  });
  assert.equal(page.source, "disabled-preview");
  assert.deepEqual(page.payload.reviews[0].video_external_ids, []);
  assert.deepEqual(page.payload.photo_gallery[0].video_external_ids, []);
  assert.deepEqual(requested, [
    "https://cdn.judge.me/reviews/reviews_for_widget",
    "https://cdn.judge.me/reviews/reviews_for_widget",
    "https://api.judge.me/reviews/sample_review_widget_data",
  ]);

  const data = createReviewWidgetV3Data({
    config: { showStoreReviews: true },
    page,
    productHandle: "example",
    productId: "gid://shopify/Product/12345",
    productTitle: "Example product",
    settings: { review_widget_header_theme: "minimal" },
    shopAggregate: { count: 42, rating: 4.7 },
    shopDomain: "store.myshopify.com",
    shopReviewsCount: 3,
  });
  assert.equal(data.enabled, false);
  assert.equal(data.source, "disabled-preview");
  assert.equal(data.product.id, "12345");
  assert.equal(data.config.showStoreReviews, true);
  assert.equal(data.config.maxWidth, 1200);
});

test("validates Review Widget v3 block controls and review markup", async () => {
  assert.throws(
    () => normalizeReviewWidgetV3Config({ maxWidth: 1201 }),
    /between 200 and 1200/,
  );
  assert.throws(
    () => normalizeReviewWidgetV3Config({ emptyState: "remove" }),
    /empty state is invalid/,
  );

  await assert.rejects(
    fetchReviewWidgetV3Page({
      shopDomain: "store.myshopify.com",
      productId: "12345",
      fetch: async () =>
        Response.json({
          ...createReviewWidgetV3Fixture(),
          reviews: [
            {
              uuid: "unsafe-review",
              rating: 5,
              body_html: '<img src="x" onerror="alert(1)">',
            },
          ],
        }),
    }),
    /executable Review Widget v3 markup/,
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

function createTrustBadgeModalFixture() {
  return {
    ai_summary: {
      text: "Customers love it.",
      last_updated: "2026-07-14",
    },
    average_rating: 4.7,
    is_certified: true,
    member_since: "January 2024",
    rating_distribution: {
      "1_star": 1,
      "2_star": 1,
      "3_star": 2,
      "4_star": 6,
      "5_star": 35,
    },
    sentiment_tags: [{ name: "Quality", sentiment: "positive" }],
    shop_domain: "store.myshopify.com",
    shop_logo_url: "https://cdn.shopify.com/example-logo.png",
    shop_name: "Fixture Store",
    total_reviews_count: 45,
    verified_reviews_count: 42,
  };
}

function canonicalizeUrlForTest(value) {
  const url = new URL(value);
  const params = [...url.searchParams.entries()].sort(
    ([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey === rightKey
        ? leftValue.localeCompare(rightValue)
        : leftKey.localeCompare(rightKey),
  );
  return `${url.origin}${url.pathname}?${new URLSearchParams(params).toString()}`;
}

function createHappyCustomersApiFixture() {
  return {
    reviews: [],
    pagination: {
      current_page: 1,
      per_page: 10,
      total_count: 12,
      total_pages: 2,
    },
    primary_language: "en",
    primary_language_reviews: [
      {
        uuid: "review-1",
        rating: 5,
        reviewer_name: "Ada",
        body_html: "<p>Excellent.</p>",
      },
    ],
    primary_language_pagination: {
      current_page: 1,
      per_page: 10,
      total_count: 9,
      total_pages: 1,
    },
    other_language_reviews: [],
    other_language_pagination: {
      current_page: 1,
      per_page: 3,
      total_count: 3,
      total_pages: 1,
    },
    number_of_product_reviews: 9,
    number_of_shop_reviews: 3,
    custom_form_filters_and_averages: null,
  };
}

function createReviewWidgetV3Fixture() {
  return {
    average_rating: 4.8,
    number_of_reviews: 15,
    number_of_questions: 0,
    sort_key: "created_at",
    pagination: {
      current_page: 1,
      per_page: 5,
      total_pages: 1,
    },
    histogram: [
      { rating: 5, frequency: 12, percentage: 80 },
      { rating: 4, frequency: 3, percentage: 20 },
    ],
    photo_gallery: [
      {
        uuid: "review-1",
        rating: 5,
        body_html: "<p>Excellent.</p>",
        video_external_ids: ["removed-vimeo-fixture"],
      },
    ],
    product_external_id: "12345",
    product_name: "Example product",
    product_medals: [],
    review_keywords: [],
    custom_form_filters_and_averages: null,
    reviews: [
      {
        uuid: "review-1",
        rating: 5,
        reviewer_name: "Ada",
        title: "Excellent",
        body_html: "<p>Excellent.</p>",
        pictures_urls: [],
        video_external_ids: ["removed-vimeo-fixture"],
      },
    ],
  };
}

function createOverlayFixture(display) {
  return {
    attributes: new Map(),
    hidden: false,
    isConnected: true,
    removed: false,
    style: { display },
    remove() {
      this.isConnected = false;
      this.removed = true;
    },
    setAttribute(name, value) {
      this.attributes.set(name, value);
    },
  };
}

function createManualTimers() {
  let nextHandle = 0;
  const callbacks = new Map();

  return {
    cancel(handle) {
      callbacks.delete(handle);
    },
    flush() {
      while (callbacks.size > 0) {
        const pending = [...callbacks.values()];
        callbacks.clear();
        for (const callback of pending) callback();
      }
    },
    schedule(callback) {
      const handle = ++nextHandle;
      callbacks.set(handle, callback);
      return handle;
    },
  };
}
