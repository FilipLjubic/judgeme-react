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
import {
  AllReviewsCounter,
  AllReviewsWidget,
  CardsCarousel,
  createCardsCarouselData,
  createPopupReviewsData,
  createReviewsGridData,
  createTestimonialsCarouselData,
  createVideosCarouselData,
  fetchCardsCarouselPage,
  fetchLegacyStorefrontWidgets,
  fetchPopupReviewsPage,
  fetchReviewsGridPage,
  fetchTestimonialsCarouselPage,
  fetchVideosCarouselPage,
  FloatingReviewsTab,
  getShopifyNumericId,
  LegacyReviewWidget,
  PopupReviews,
  ReviewsCarousel,
  ReviewsGrid,
  StarRatingBadge,
  TestimonialsCarousel,
  VideosCarousel,
} from '@judgeme-react/core';

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
  const judgeMeWidgets = await loadJudgeMeWidgets({
    productId: criticalData.product.id,
    publicToken: env.JUDGEME_PUBLIC_TOKEN,
    shopDomain: env.JUDGEME_SHOP_DOMAIN ?? env.PUBLIC_STORE_DOMAIN,
    v3AssetBaseUrl: env.JUDGEME_V3_ASSET_BASE_URL,
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

  const [{product}] = await Promise.all([
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
    product,
  };
}

async function loadJudgeMeWidgets({
  productId,
  publicToken,
  shopDomain,
  v3AssetBaseUrl,
  signal,
}: {
  productId: string;
  publicToken?: string;
  shopDomain: string;
  v3AssetBaseUrl?: string;
  signal: AbortSignal;
}) {
  if (!publicToken) return null;

  try {
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
    const legacyWidgetsPromise = fetchLegacyStorefrontWidgets({
      productId: numericProductId,
      publicToken,
      shopDomain,
      signal,
    });
    const [
      legacyWidgets,
      reviewsGridPage,
      cardsCarouselPage,
      testimonialsCarouselPage,
      videosCarouselPage,
    ] = await Promise.all([
      legacyWidgetsPromise,
      v3AssetBaseUrl
        ? fetchReviewsGridPage({
            shopDomain,
            productId: numericProductId,
            config: reviewsGridConfig,
            signal,
          })
        : Promise.resolve(null),
      v3AssetBaseUrl
        ? fetchCardsCarouselPage({
            shopDomain,
            productId: numericProductId,
            config: cardsCarouselConfig,
            signal,
          })
        : Promise.resolve(null),
      v3AssetBaseUrl
        ? fetchTestimonialsCarouselPage({
            shopDomain,
            productId: numericProductId,
            config: testimonialsCarouselConfig,
            signal,
          })
        : Promise.resolve(null),
      v3AssetBaseUrl
        ? fetchVideosCarouselPage({
            shopDomain,
            productId: numericProductId,
            config: videosCarouselConfig,
            signal,
          })
        : Promise.resolve(null),
    ]);
    const popupReviewsPage = await fetchPopupReviewsPage({
      shopDomain,
      settings: legacyWidgets.resources.settings,
      signal,
    });

    return {
      ...legacyWidgets,
      popupReviews: createPopupReviewsData({
        page: popupReviewsPage,
        settings: legacyWidgets.resources.settings,
        shopDomain,
      }),
      reviewsGrid: reviewsGridPage
        ? createReviewsGridData({
            aggregate: {
              count: legacyWidgets.allReviewsCounter.count,
              rating: Number(legacyWidgets.allReviewsCounter.rating),
            },
            config: reviewsGridConfig,
            page: reviewsGridPage,
            productId: numericProductId,
            settings: legacyWidgets.resources.settings,
            shopDomain,
          })
        : null,
      cardsCarousel: cardsCarouselPage
        ? createCardsCarouselData({
            aggregate: {
              count: legacyWidgets.allReviewsCounter.count,
              rating: Number(legacyWidgets.allReviewsCounter.rating),
            },
            config: cardsCarouselConfig,
            page: cardsCarouselPage,
            productId: numericProductId,
            settings: legacyWidgets.resources.settings,
            shopDomain,
            styles: legacyWidgets.resources.styles,
          })
        : null,
      testimonialsCarousel: testimonialsCarouselPage
        ? createTestimonialsCarouselData({
            aggregate: {
              count: legacyWidgets.allReviewsCounter.count,
              rating: Number(legacyWidgets.allReviewsCounter.rating),
            },
            config: testimonialsCarouselConfig,
            page: testimonialsCarouselPage,
            productId: numericProductId,
            settings: legacyWidgets.resources.settings,
            shopDomain,
            styles: legacyWidgets.resources.styles,
          })
        : null,
      videosCarousel: videosCarouselPage
        ? createVideosCarouselData({
            aggregate: {
              count: legacyWidgets.allReviewsCounter.count,
              rating: Number(legacyWidgets.allReviewsCounter.rating),
            },
            config: videosCarouselConfig,
            page: videosCarouselPage,
            productId: numericProductId,
            settings: legacyWidgets.resources.settings,
            shopDomain,
            styles: legacyWidgets.resources.styles,
          })
        : null,
    };
  } catch (error) {
    console.error('Unable to load the Judge.me product widgets', error);
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
        {judgeMeWidgets ? (
          <StarRatingBadge
            className="product-rating"
            data={{
              ...judgeMeWidgets.starRatingBadge,
              ...judgeMeWidgets.resources,
            }}
            includeStyles={false}
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
          <AllReviewsCounter
            className="product-reviews-counter"
            data={{
              ...judgeMeWidgets.allReviewsCounter,
              ...judgeMeWidgets.resources,
            }}
            includeStyles={false}
          />
          {judgeMeWidgets.cardsCarousel ? (
            <CardsCarousel
              className="product-cards-carousel"
              data={judgeMeWidgets.cardsCarousel}
              includeStyles={false}
            />
          ) : null}
          {judgeMeWidgets.testimonialsCarousel ? (
            <TestimonialsCarousel
              className="product-testimonials-carousel"
              data={judgeMeWidgets.testimonialsCarousel}
              includeStyles={false}
            />
          ) : null}
          {judgeMeWidgets.videosCarousel ? (
            <VideosCarousel
              className="product-videos-carousel"
              data={judgeMeWidgets.videosCarousel}
              includeStyles={false}
            />
          ) : null}
          <ReviewsCarousel
            className="product-reviews-carousel"
            data={{
              ...judgeMeWidgets.reviewsCarousel,
              ...judgeMeWidgets.resources,
            }}
            includeStyles={false}
          />
          <LegacyReviewWidget
            className="product-reviews"
            data={{
              ...judgeMeWidgets.reviewWidget,
              ...judgeMeWidgets.resources,
            }}
          />
          <AllReviewsWidget
            className="product-all-reviews"
            data={{
              ...judgeMeWidgets.allReviewsWidget,
              ...judgeMeWidgets.resources,
            }}
            includeStyles={false}
          />
          {judgeMeWidgets.reviewsGrid ? (
            <ReviewsGrid
              className="product-reviews-grid"
              data={judgeMeWidgets.reviewsGrid}
            />
          ) : null}
        </div>
      ) : null}
      {judgeMeWidgets ? (
        <FloatingReviewsTab
          data={{
            ...judgeMeWidgets.floatingReviewsTab,
            ...judgeMeWidgets.resources,
          }}
          includeStyles={false}
          position="right"
        />
      ) : null}
      {judgeMeWidgets ? (
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
  }
  ${PRODUCT_FRAGMENT}
` as const;
