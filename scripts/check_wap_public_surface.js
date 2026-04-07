#!/usr/bin/env node

const https = require('node:https');

const HOME_URL = 'https://www.blifehealthy.com';
const MANIFEST_URL = `${HOME_URL}/manifest.json`;
const CATEGORIES_URL = 'https://bao.blifehealthy.com/api/categories';
const STOREFRONT_PRODUCTS_URL = 'https://www.blifehealthy.com/api/products/storefront';

const fail = message => {
  throw new Error(message);
};

const normalizeListPayload = payload => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.items)) {
      return payload.items;
    }

    if (Array.isArray(payload.data)) {
      return payload.data;
    }
  }

  return [];
};

const request = (url, headers = {}) =>
  new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers,
      },
      response => {
        const chunks = [];

        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');

          if (!response.statusCode || response.statusCode >= 400) {
            reject(
              new Error(
                `Request failed for ${url}: ${response.statusCode || 0} ${response.statusMessage || ''}`.trim(),
              ),
            );
            return;
          }

          resolve(body);
        });
      },
    );

    req.on('error', reject);
  });

const fetchText = url => {
  return request(url, {
    'cache-control': 'no-cache',
  });
};

const fetchJson = async url => {
  const body = await request(url, {
    accept: 'application/json',
    'cache-control': 'no-cache',
  });

  return JSON.parse(body);
};

const extractTitle = html => {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  return match ? match[1].trim() : '';
};

const extractIconHref = html => {
  const match = html.match(/<link[^>]+rel="icon"[^>]+href="([^"]+)"/i);
  return match ? match[1].trim() : '';
};

const extractAppleTouchIconHref = html => {
  const match = html.match(/<link[^>]+rel="apple-touch-icon"[^>]+href="([^"]+)"/i);
  return match ? match[1].trim() : '';
};

const summarize = (label, value) => {
  process.stdout.write(`${label}: ${value}\n`);
};

const main = async () => {
  const homeHtml = await fetchText(HOME_URL);
  const manifest = await fetchJson(MANIFEST_URL);
  const categoriesPayload = await fetchJson(CATEGORIES_URL);
  const storefrontPayload = await fetchJson(STOREFRONT_PRODUCTS_URL);

  const title = extractTitle(homeHtml);
  const iconHref = extractIconHref(homeHtml);
  const appleTouchIconHref = extractAppleTouchIconHref(homeHtml);

  if (title !== 'Blife Healthy') {
    fail(`Unexpected title: ${title || '(missing)'}`);
  }

  if (iconHref !== '/16.png') {
    fail(`Unexpected favicon href: ${iconHref || '(missing)'}`);
  }

  if (appleTouchIconHref !== '/16.png') {
    fail(`Unexpected apple-touch-icon href: ${appleTouchIconHref || '(missing)'}`);
  }

  if (manifest.short_name !== 'Blife Healthy' || manifest.name !== 'Blife Healthy') {
    fail(
      `Unexpected manifest naming: short_name=${manifest.short_name || '(missing)'}, name=${manifest.name || '(missing)'}`,
    );
  }

  const manifestIcons = Array.isArray(manifest.icons) ? manifest.icons : [];

  if (!manifestIcons.some(icon => icon && icon.src === '16.png')) {
    fail('Manifest icons do not include 16.png');
  }

  const categories = normalizeListPayload(categoriesPayload);
  const products = normalizeListPayload(storefrontPayload);
  const categoryImageCount = categories.filter(category => {
    return typeof category?.image === 'string' && category.image.trim() !== '';
  }).length;
  const multiImageProductCount = products.filter(product => {
    const gallery = [
      product?.primaryImageUrl,
      ...(Array.isArray(product?.imageUrls) ? product.imageUrls : []),
    ].filter(value => typeof value === 'string' && value.trim() !== '');

    return new Set(gallery).size > 1;
  }).length;

  if (categoryImageCount === 0) {
    fail('Categories API did not return any categories with image values');
  }

  if (multiImageProductCount === 0) {
    fail('Storefront products API did not return any active products with multiple gallery images');
  }

  summarize('title', title);
  summarize('favicon', iconHref);
  summarize('appleTouchIcon', appleTouchIconHref);
  summarize('categoriesWithImage', String(categoryImageCount));
  summarize('productsWithMultiImageGallery', String(multiImageProductCount));
  summarize('result', 'ok');
};

main().catch(error => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
