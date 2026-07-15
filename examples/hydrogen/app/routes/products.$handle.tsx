import {redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/products.$handle';
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
} from '@shopify/hydrogen';
import {ProductPrice} from '~/components/ProductPrice';
import {ProductImage} from '~/components/ProductImage';
import {ProductForm} from '~/components/ProductForm';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {resolveJudgeMeAssets} from '~/lib/judgeme.server';
import {
  AiReviewsSummary,
  AllReviewsCounter,
  AllReviewsWidget,
  CardsCarousel,
  FloatingReviewsTab,
  HappyCustomers,
  JudgeMeMedals,
  LegacyReviewWidget,
  PopupReviews,
  QuestionsAndAnswers,
  ReviewsCarousel,
  ReviewsGrid,
  ReviewSnippets,
  ReviewWidgetV3,
  StarRatingBadge,
  TestimonialsCarousel,
  TrustBadge,
  UgcMediaGrid,
  VideosCarousel,
  VerifiedReviewsCounter,
} from 'judgeme-react/react';
import {
  createAiReviewsSummaryData,
  createCardsCarouselData,
  createHappyCustomersData,
  createPopupReviewsData,
  createQuestionsAndAnswersData,
  createReviewSnippetsData,
  createReviewWidgetV3Data,
  createReviewsGridData,
  createTestimonialsCarouselData,
  createTrustBadgeData,
  createVideosCarouselData,
  fetchAiReviewsSummaryMetafield,
  fetchCardsCarouselPage,
  fetchHappyCustomersPage,
  fetchLegacyStorefrontWidgets,
  fetchPopupReviewsPage,
  fetchQuestionsAndAnswersPage,
  fetchReviewSnippetsPage,
  fetchReviewWidgetV3Page,
  fetchReviewsGridPage,
  fetchTestimonialsCarouselPage,
  fetchTrustBadgeMetafields,
  fetchVideosCarouselPage,
  getShopifyNumericId,
  normalizeQuestionsAndAnswersConfig,
} from 'judgeme-react/server';

export const meta: Route.MetaFunction = ({data}) => {
  return [
    {title: `Hydrogen | ${data?.product.title ?? ''}`},
    {
      rel: 'canonical',
      href: `/products/${data?.product.handle}`,
    },
  ];
};

export async function loader(args: Route.LoaderArgs) {
  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);
  const {env} = args.context;
  const shopDomain = env.JUDGEME_SHOP_DOMAIN ?? env.PUBLIC_STORE_DOMAIN;
  const judgeMeAssets = await resolveJudgeMeAssets({
    fallbackAssetBaseUrl: env.JUDGEME_V3_ASSET_BASE_URL,
    shopDomain,
    storefrontUrl: env.JUDGEME_STOREFRONT_URL,
  });
  const judgeMeWidgets = await loadJudgeMeWidgets({
    aiReviewsSummaryMetafieldValue: criticalData.aiReviewsSummaryMetafieldValue,
    productId: criticalData.product.id,
    productHandle: criticalData.product.handle,
    productTitle: criticalData.product.title,
    shopifyAdminAccessToken: env.SHOPIFY_ADMIN_ACCESS_TOKEN,
    shopifyAdminApiVersion: env.SHOPIFY_ADMIN_API_VERSION ?? '2026-04',
    publicToken: env.JUDGEME_PUBLIC_TOKEN,
    shopDomain,
    v3AssetBaseUrl: judgeMeAssets?.assetBaseUrl,
    signal: args.request.signal,
  });

  return {...criticalData, judgeMeWidgets};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context, params, request}: Route.LoaderArgs) {
  const {handle} = params;
  const {storefront} = context;

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  const [{product, shop}] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {handle, selectedOptions: getSelectedProductOptions(request)},
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  // The API handle might be localized, so redirect to the localized handle
  redirectIfHandleIsLocalized(request, {handle, data: product});

  return {
    aiReviewsSummaryMetafieldValue:
      shop?.judgeMeStoreSummaryWidgetData?.value ?? null,
    product,
  };
}

async function loadJudgeMeWidgets({
  aiReviewsSummaryMetafieldValue,
  productId,
  productHandle,
  productTitle,
  publicToken,
  shopifyAdminAccessToken,
  shopifyAdminApiVersion,
  shopDomain,
  v3AssetBaseUrl,
  signal,
}: {
  aiReviewsSummaryMetafieldValue: string | null;
  productId: string;
  productHandle: string;
  productTitle: string;
  publicToken?: string;
  shopifyAdminAccessToken?: string;
  shopifyAdminApiVersion: string;
  shopDomain: string;
  v3AssetBaseUrl?: string;
  signal: AbortSignal;
}) {
  if (!publicToken) return null;

  const numericProductId = getShopifyNumericId(productId);
  const reviewsGridConfig = {
    numberOfColumnsDesktop: 5,
    numberOfRowsDesktop: 1,
    numberOfColumnsMobile: 2,
    numberOfRowsMobile: 2,
  } as const;
  const cardsCarouselConfig = {} as const;
  const testimonialsCarouselConfig = {} as const;
  const videosCarouselConfig = {reviewType: 'photos-and-videos'} as const;
  const reviewSnippetsConfig = {
    reviewSelection: 'current_product',
    showReviewMedia: true,
  } as const;
  const happyCustomersConfig = {maxWidth: 1100} as const;
  const reviewWidgetV3Config = {
    maxWidth: 1200,
    showStoreReviews: true,
  } as const;
  const legacyWidgets = await loadOptionalJudgeMeData(
    'legacy storefront batch',
    () =>
      fetchLegacyStorefrontWidgets({
        productId: numericProductId,
        publicToken,
        shopDomain,
        signal,
      }),
    signal,
  );
  if (!legacyWidgets) return null;

  const qnaEnabled = normalizeQuestionsAndAnswersConfig(
    legacyWidgets.resources.settings,
  ).dashboardEnabled;
  const [
    reviewsGridPage,
    cardsCarouselPage,
    testimonialsCarouselPage,
    videosCarouselPage,
    reviewSnippetsPage,
    happyCustomersPage,
    reviewWidgetV3Page,
    questionsAndAnswersPage,
    popupReviewsPage,
    trustBadgeMetafields,
    adminAiReviewsSummaryMetafieldValue,
  ] = await Promise.all([
    loadOptionalJudgeMeData(
      'Reviews Grid',
      v3AssetBaseUrl
        ? () =>
            fetchReviewsGridPage({
              shopDomain,
              productId: numericProductId,
              config: reviewsGridConfig,
              signal,
            })
        : null,
      signal,
    ),
    loadOptionalJudgeMeData(
      'Cards Carousel',
      v3AssetBaseUrl
        ? () =>
            fetchCardsCarouselPage({
              shopDomain,
              productId: numericProductId,
              config: cardsCarouselConfig,
              signal,
            })
        : null,
      signal,
    ),
    loadOptionalJudgeMeData(
      'Testimonials Carousel',
      v3AssetBaseUrl
        ? () =>
            fetchTestimonialsCarouselPage({
              shopDomain,
              productId: numericProductId,
              config: testimonialsCarouselConfig,
              signal,
            })
        : null,
      signal,
    ),
    loadOptionalJudgeMeData(
      'Videos Carousel',
      v3AssetBaseUrl
        ? () =>
            fetchVideosCarouselPage({
              shopDomain,
              productId: numericProductId,
              config: videosCarouselConfig,
              signal,
            })
        : null,
      signal,
    ),
    loadOptionalJudgeMeData(
      'Review Snippets',
      v3AssetBaseUrl
        ? () =>
            fetchReviewSnippetsPage({
              shopDomain,
              productId: numericProductId,
              config: reviewSnippetsConfig,
              signal,
            })
        : null,
      signal,
    ),
    loadOptionalJudgeMeData(
      'Happy Customers',
      v3AssetBaseUrl
        ? () =>
            fetchHappyCustomersPage({
              shopDomain,
              config: happyCustomersConfig,
              signal,
            })
        : null,
      signal,
    ),
    loadOptionalJudgeMeData(
      'Review Widget v3',
      v3AssetBaseUrl
        ? () =>
            fetchReviewWidgetV3Page({
              shopDomain,
              productId: numericProductId,
              previewWhenDisabled: true,
              signal,
            })
        : null,
      signal,
    ),
    loadOptionalJudgeMeData(
      'Questions & Answers',
      qnaEnabled
        ? () =>
            fetchQuestionsAndAnswersPage({
              shopDomain,
              productId: numericProductId,
              signal,
            })
        : null,
      signal,
    ),
    loadOptionalJudgeMeData(
      'Pop-up Reviews',
      () =>
        fetchPopupReviewsPage({
          shopDomain,
          settings: legacyWidgets.resources.settings,
          signal,
        }),
      signal,
    ),
    loadOptionalJudgeMeData(
      'Trust Badge metafields',
      shopifyAdminAccessToken && v3AssetBaseUrl
        ? () =>
            fetchTrustBadgeMetafields({
              adminAccessToken: shopifyAdminAccessToken,
              apiVersion: shopifyAdminApiVersion,
              shopDomain,
              signal,
            })
        : null,
      signal,
    ),
    loadOptionalJudgeMeData(
      'AI Reviews Summary metafield',
      !aiReviewsSummaryMetafieldValue &&
        shopifyAdminAccessToken &&
        v3AssetBaseUrl
        ? () =>
            fetchAiReviewsSummaryMetafield({
              adminAccessToken: shopifyAdminAccessToken,
              apiVersion: shopifyAdminApiVersion,
              shopDomain,
              signal,
            })
        : null,
      signal,
    ),
  ]);
  const aggregate = legacyWidgets.allReviewsCounter
    ? {
        count: legacyWidgets.allReviewsCounter.count,
        rating: Number(legacyWidgets.allReviewsCounter.rating),
      }
    : null;
  const legacyAllReviewsWidget = legacyWidgets.allReviewsWidget;
  const resolvedAiReviewsSummaryMetafieldValue =
    aiReviewsSummaryMetafieldValue ?? adminAiReviewsSummaryMetafieldValue;

  return {
    ...legacyWidgets,
    aiReviewsSummary:
      v3AssetBaseUrl && resolvedAiReviewsSummaryMetafieldValue
        ? createOptionalJudgeMeData('AI Reviews Summary', () =>
            createAiReviewsSummaryData({
              config: {
                theme: 'accordion',
                keywordsVisibility: 'when_click',
                showButton: false,
              },
              metafieldValue: resolvedAiReviewsSummaryMetafieldValue,
              settings: legacyWidgets.resources.settings,
              shopDomain,
              source: 'metafield',
              styles: legacyWidgets.resources.styles,
            }),
          )
        : null,
    popupReviews: popupReviewsPage
      ? createOptionalJudgeMeData('Pop-up Reviews', () =>
          createPopupReviewsData({
            page: popupReviewsPage,
            settings: legacyWidgets.resources.settings,
            shopDomain,
          }),
        )
      : null,
    questionsAndAnswers: questionsAndAnswersPage
      ? createOptionalJudgeMeData('Questions & Answers', () =>
          createQuestionsAndAnswersData({
            page: questionsAndAnswersPage,
            productId: numericProductId,
            productHandle,
            productTitle,
            settings: legacyWidgets.resources.settings,
            shopDomain,
          }),
        )
      : null,
    reviewSnippets: reviewSnippetsPage
      ? createOptionalJudgeMeData('Review Snippets', () =>
          createReviewSnippetsData({
            config: reviewSnippetsConfig,
            page: reviewSnippetsPage,
            productId: numericProductId,
            settings: legacyWidgets.resources.settings,
            shopDomain,
            styles: legacyWidgets.resources.styles,
          }),
        )
      : null,
    reviewWidgetV3: reviewWidgetV3Page && aggregate
      ? createOptionalJudgeMeData('Review Widget v3', () =>
          createReviewWidgetV3Data({
            config: reviewWidgetV3Config,
            page: reviewWidgetV3Page,
            productHandle,
            productId: numericProductId,
            productTitle,
            settings: legacyWidgets.resources.settings,
            shopAggregate: aggregate,
            shopDomain,
            shopReviewsCount: happyCustomersPage?.numberOfShopReviews ?? 0,
            styles: legacyWidgets.resources.styles,
          }),
        )
      : null,
    happyCustomers:
      happyCustomersPage && aggregate && legacyAllReviewsWidget
      ? createOptionalJudgeMeData('Happy Customers', () =>
          createHappyCustomersData({
            aggregate,
            config: happyCustomersConfig,
            legacyHtml: legacyAllReviewsWidget.html,
            page: happyCustomersPage,
            previewWhenDisabled: true,
            settings: legacyWidgets.resources.settings,
            shopDomain,
            styles: legacyWidgets.resources.styles,
          }),
        )
      : null,
    reviewsGrid: reviewsGridPage && aggregate
      ? createOptionalJudgeMeData('Reviews Grid', () =>
          createReviewsGridData({
            aggregate,
            config: reviewsGridConfig,
            page: reviewsGridPage,
            productId: numericProductId,
            settings: legacyWidgets.resources.settings,
            shopDomain,
            styles: legacyWidgets.resources.styles,
          }),
        )
      : null,
    cardsCarousel: cardsCarouselPage && aggregate
      ? createOptionalJudgeMeData('Cards Carousel', () =>
          createCardsCarouselData({
            aggregate,
            config: cardsCarouselConfig,
            page: cardsCarouselPage,
            productId: numericProductId,
            settings: legacyWidgets.resources.settings,
            shopDomain,
            styles: legacyWidgets.resources.styles,
          }),
        )
      : null,
    testimonialsCarousel: testimonialsCarouselPage && aggregate
      ? createOptionalJudgeMeData('Testimonials Carousel', () =>
          createTestimonialsCarouselData({
            aggregate,
            config: testimonialsCarouselConfig,
            page: testimonialsCarouselPage,
            productId: numericProductId,
            settings: legacyWidgets.resources.settings,
            shopDomain,
            styles: legacyWidgets.resources.styles,
          }),
        )
      : null,
    trustBadge: trustBadgeMetafields
      ? createOptionalJudgeMeData('Trust Badge', () =>
          createTrustBadgeData({
            metafields: trustBadgeMetafields,
            previewWhenDisabled: true,
            settings: legacyWidgets.resources.settings,
            shopDomain,
            styles: legacyWidgets.resources.styles,
          }),
        )
      : null,
    videosCarousel: videosCarouselPage && aggregate
      ? createOptionalJudgeMeData('Videos Carousel', () =>
          createVideosCarouselData({
            aggregate,
            config: videosCarouselConfig,
            page: videosCarouselPage,
            productId: numericProductId,
            settings: legacyWidgets.resources.settings,
            shopDomain,
            styles: legacyWidgets.resources.styles,
          }),
        )
      : null,
  };
}

async function loadOptionalJudgeMeData<T>(
  label: string,
  load: (() => Promise<T>) | null,
  signal: AbortSignal,
): Promise<T | null> {
  if (!load) return null;

  try {
    return await load();
  } catch (error) {
    if (!signal.aborted) {
      console.error(`Unable to load Judge.me ${label}`, error);
    }
    return null;
  }
}

function createOptionalJudgeMeData<T>(
  label: string,
  create: () => T,
): T | null {
  try {
    return create();
  } catch (error) {
    console.error(`Unable to create Judge.me ${label}`, error);
    return null;
  }
}

export default function Product() {
  const {product, judgeMeWidgets} = useLoaderData<typeof loader>();

  // Optimistically selects a variant with given available variant information
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  // Sets the search param to the selected variant without navigation
  // only when no search params are set in the url
  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  // Get the product options array
  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  const {title, descriptionHtml} = product;

  return (
    <div className="product">
      <ProductImage image={selectedVariant?.image} />
      <div className="product-main">
        <h1>{title}</h1>
        {judgeMeWidgets?.starRatingBadge ? (
          <StarRatingBadge
            className="product-rating"
            data={{
              ...judgeMeWidgets.starRatingBadge,
              ...judgeMeWidgets.resources,
            }}
          />
        ) : null}
        <ProductPrice
          price={selectedVariant?.price}
          compareAtPrice={selectedVariant?.compareAtPrice}
        />
        <br />
        <ProductForm
          productOptions={productOptions}
          selectedVariant={selectedVariant}
        />
        <br />
        <br />
        <p>
          <strong>Description</strong>
        </p>
        <br />
        <div dangerouslySetInnerHTML={{__html: descriptionHtml}} />
        <br />
      </div>
      {judgeMeWidgets ? (
        <div className="product-widgets">
          {judgeMeWidgets.verifiedReviewsCounter ? (
            <VerifiedReviewsCounter
              className="product-verified-reviews-counter"
              data={{
                ...judgeMeWidgets.verifiedReviewsCounter,
                ...judgeMeWidgets.resources,
              }}
            />
          ) : null}
          {judgeMeWidgets.medals ? (
            <JudgeMeMedals
              className="product-judgeme-medals"
              data={{
                ...judgeMeWidgets.medals,
                ...judgeMeWidgets.resources,
              }}
            />
          ) : null}
          {judgeMeWidgets.trustBadge ? (
            <div className="product-trust-badge-preview">
              {judgeMeWidgets.trustBadge.source === 'disabled-preview' ? (
                <p className="judgeme-preview-note">
                  Trust Badge preview — disabled in Judge.me
                </p>
              ) : null}
              <TrustBadge data={judgeMeWidgets.trustBadge} />
            </div>
          ) : null}
          {judgeMeWidgets.ugcMediaGrid ? (
            <UgcMediaGrid
              className="product-ugc-media-grid"
              data={{
                ...judgeMeWidgets.ugcMediaGrid,
                ...judgeMeWidgets.resources,
              }}
            />
          ) : null}
          {judgeMeWidgets.allReviewsCounter ? (
            <AllReviewsCounter
              className="product-reviews-counter"
              data={{
                ...judgeMeWidgets.allReviewsCounter,
                ...judgeMeWidgets.resources,
              }}
            />
          ) : null}
          {judgeMeWidgets.happyCustomers ? (
            <div className="product-happy-customers-preview">
              {judgeMeWidgets.happyCustomers.source === 'disabled-preview' ? (
                <p className="judgeme-preview-note">
                  Happy Customers preview — new version disabled in Judge.me
                </p>
              ) : null}
              <HappyCustomers data={judgeMeWidgets.happyCustomers} />
            </div>
          ) : null}
          {judgeMeWidgets.aiReviewsSummary ? (
            <AiReviewsSummary
              className="product-ai-reviews-summary"
              data={judgeMeWidgets.aiReviewsSummary}
            />
          ) : null}
          {judgeMeWidgets.reviewSnippets ? (
            <ReviewSnippets
              className="product-review-snippets"
              data={judgeMeWidgets.reviewSnippets}
            />
          ) : null}
          {judgeMeWidgets.questionsAndAnswers ? (
            <QuestionsAndAnswers
              className="product-questions-and-answers"
              data={judgeMeWidgets.questionsAndAnswers}
            />
          ) : null}
          {judgeMeWidgets.cardsCarousel ? (
            <CardsCarousel
              className="product-cards-carousel"
              data={judgeMeWidgets.cardsCarousel}
            />
          ) : null}
          {judgeMeWidgets.testimonialsCarousel ? (
            <TestimonialsCarousel
              className="product-testimonials-carousel"
              data={judgeMeWidgets.testimonialsCarousel}
            />
          ) : null}
          {judgeMeWidgets.videosCarousel ? (
            <VideosCarousel
              className="product-videos-carousel"
              data={judgeMeWidgets.videosCarousel}
            />
          ) : null}
          {judgeMeWidgets.reviewsCarousel ? (
            <ReviewsCarousel
              className="product-reviews-carousel"
              data={{
                ...judgeMeWidgets.reviewsCarousel,
                ...judgeMeWidgets.resources,
              }}
            />
          ) : null}
          {judgeMeWidgets.reviewWidgetV3 ? (
            <div className="product-review-widget-v3-preview">
              {judgeMeWidgets.reviewWidgetV3.source === 'disabled-preview' ? (
                <p className="judgeme-preview-note">
                  Review Widget v3 preview — new version disabled in Judge.me
                </p>
              ) : null}
              <ReviewWidgetV3 data={judgeMeWidgets.reviewWidgetV3} />
            </div>
          ) : judgeMeWidgets.reviewWidget ? (
            <LegacyReviewWidget
              className="product-reviews"
              data={{
                ...judgeMeWidgets.reviewWidget,
                ...judgeMeWidgets.resources,
              }}
            />
          ) : null}
          {judgeMeWidgets.allReviewsWidget ? (
            <AllReviewsWidget
              className="product-all-reviews"
              data={{
                ...judgeMeWidgets.allReviewsWidget,
                ...judgeMeWidgets.resources,
              }}
            />
          ) : null}
          {judgeMeWidgets.reviewsGrid ? (
            <ReviewsGrid
              className="product-reviews-grid"
              data={judgeMeWidgets.reviewsGrid}
            />
          ) : null}
        </div>
      ) : null}
      {judgeMeWidgets?.floatingReviewsTab ? (
        <FloatingReviewsTab
          data={{
            ...judgeMeWidgets.floatingReviewsTab,
            ...judgeMeWidgets.resources,
          }}
          position="right"
        />
      ) : null}
      {judgeMeWidgets?.popupReviews ? (
        <PopupReviews data={judgeMeWidgets.popupReviews} pageType="product" />
      ) : null}
      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />
    </div>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    product {
      title
      handle
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
` as const;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
    encodedVariantExistence
    encodedVariantAvailability
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariant
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
    adjacentVariants (selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
    shop {
      judgeMeStoreSummaryWidgetData: metafield(
        namespace: "judgeme"
        key: "store_summary_widget_data"
      ) {
        value
      }
    }
  }
  ${PRODUCT_FRAGMENT}
` as const;
