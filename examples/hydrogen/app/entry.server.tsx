import {ServerRouter} from 'react-router';
import {isbot} from 'isbot';
import {renderToReadableStream} from 'react-dom/server';
import {
  createContentSecurityPolicy,
  type HydrogenRouterContextProvider,
} from '@shopify/hydrogen';
import type {EntryContext} from 'react-router';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  context: HydrogenRouterContextProvider,
) {
  const {nonce, header, NonceProvider} = createContentSecurityPolicy({
    shop: {
      checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
      storeDomain: context.env.PUBLIC_STORE_DOMAIN,
    },
    scriptSrc: [
      "'self'",
      'https://cdnwidget.judge.me',
      'https://cdn2.judge.me',
      'https://cdn.shopify.com',
      'https://shopify.com',
    ],
    workerSrc: ["'self'", 'blob:'],
    styleSrc: [
      'https://cdnwidget.judge.me',
      'https://cdn2.judge.me',
      'https://cdn.shopify.com',
    ],
    connectSrc: [
      'https://judge.me',
      'https://*.judge.me',
      'https://judgeme-public-images.imgix.net',
      'https://cdn.shopify.com',
    ],
    fontSrc: [
      'data:',
      'https://cdnwidget.judge.me',
      'https://cdn2.judge.me',
      'https://cdn.shopify.com',
    ],
    imgSrc: [
      "'self'",
      'data:',
      'https://judge.me',
      'https://*.judge.me',
      'https://judgeme.imgix.net',
      'https://judgeme-public-images.imgix.net',
      'https://s3.amazonaws.com',
      'https://cdn.shopify.com',
      'https://*.cdninstagram.com',
      'https://*.fbcdn.net',
    ],
    mediaSrc: [
      'https://*.judge.me',
      'https://cdn.shopify.com',
      'https://*.cdninstagram.com',
      'https://*.fbcdn.net',
    ],
    frameSrc: [
      'https://*.judge.me',
      'https://*.cdninstagram.com',
      'https://*.fbcdn.net',
      'https://www.youtube.com',
      'https://player.vimeo.com',
    ],
  });

  const body = await renderToReadableStream(
    <NonceProvider>
      <ServerRouter
        context={reactRouterContext}
        url={request.url}
        nonce={nonce}
      />
    </NonceProvider>,
    {
      nonce,
      signal: request.signal,
      onError(error) {
        console.error(error);
        responseStatusCode = 500;
      },
    },
  );

  if (isbot(request.headers.get('user-agent'))) {
    await body.allReady;
  }

  responseHeaders.set('Content-Type', 'text/html');
  responseHeaders.set('Content-Security-Policy', header);

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
