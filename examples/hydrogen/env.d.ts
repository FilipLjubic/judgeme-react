/// <reference types="vite/client" />
/// <reference types="react-router" />
/// <reference types="@shopify/oxygen-workers-types" />
/// <reference types="@shopify/hydrogen/react-router-types" />

// Enhance TypeScript's built-in typings.
import '@total-typescript/ts-reset';

declare global {
  interface Env {
    JUDGEME_PRIVATE_TOKEN?: string;
    JUDGEME_PUBLIC_TOKEN?: string;
    JUDGEME_SHOP_DOMAIN?: string;
    JUDGEME_V3_ASSET_BASE_URL?: string;
  }
}
