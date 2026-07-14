/// <reference types="vite/client" />
/// <reference types="react-router" />
/// <reference types="@shopify/oxygen-workers-types" />
/// <reference types="@shopify/hydrogen/react-router-types" />

// Enhance TypeScript's built-in typings.
import '@total-typescript/ts-reset';

declare global {
  interface Env {
    SHOPIFY_ADMIN_ACCESS_TOKEN?: string;
    SHOPIFY_ADMIN_API_VERSION?: string;
    JUDGEME_PUBLIC_TOKEN?: string;
    JUDGEME_SHOP_DOMAIN?: string;
    JUDGEME_STOREFRONT_URL?: string;
    JUDGEME_V3_ASSET_BASE_URL?: string;
  }
}
