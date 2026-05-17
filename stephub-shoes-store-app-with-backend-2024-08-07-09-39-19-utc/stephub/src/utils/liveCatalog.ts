import axios from 'axios';

import {URLS} from '../config';
import {ProductType} from '../types';

type StorefrontProduct = {
  productDetailId: string;
  productId: string;
  productCode: string;
  productName: string;
  categoryCode: string;
  categoryName: string;
  supplierCode: string;
  supplierName: string;
  code: string;
  name: string;
  shortDescription?: string | null;
  description?: string | null;
  primaryImageUrl?: string | null;
  homeCardImageUrl?: string | null;
  youtubeUrl?: string | null;
  imageUrls?: string[];
  memberPriceUsdt: string;
  pv: string;
  firmRedemptionEligible?: boolean;
  dcwSpendEnabled?: boolean;
  dcwUsageAmount?: string;
  dcwRewardRate?: string;
  dcwCashRewardRate?: string;
  dcwShoppingRewardRate?: string;
  ratingAvg?: string;
  ratingCount?: number;
  isNew?: boolean;
  isTop?: boolean;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  salesChannelMode?: string;
  status: string;
};

type BasicProduct = {
  productId?: string;
  supplierId?: string;
  supplierCode?: string;
  categoryId?: string;
  categoryCode?: string;
  code?: string;
  name?: string;
  status?: string;
};

type CatalogCategory = {
  code?: string;
  image?: string | null;
  imageUrl?: string | null;
};

const DEFAULT_CATALOG_IMAGE = '/16.png';

const isPublicWapRuntime = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const hostname = window.location.hostname.toLowerCase();
  return (
    hostname === 'blifehealthy.com' ||
    hostname === 'wap.blifehealthy.com' ||
    hostname === 'www.blifehealthy.com'
  );
};

const resolveStorageImageUrl = (path: string): string => {
  const normalizedPath = path.replace(/^\/+/, '');

  if (isPublicWapRuntime()) {
    return `${window.location.origin}/storage/${normalizedPath.replace(/^storage\//, '')}`;
  }

  return `${URLS.BAO_BASE_URL}/storage/${normalizedPath.replace(/^storage\//, '')}`;
};

const resolveCatalogImageUrl = (value?: string | null): string => {
  const trimmed = String(value || '').trim();

  if (!trimmed) {
    return '';
  }

  if (trimmed.startsWith('data:image/') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsedUrl = new URL(trimmed);

      if (
        isPublicWapRuntime() &&
        /(^|\.)(bao\.blifehealthy\.com|wap\.blifehealthy\.com|www\.blifehealthy\.com|blifehealthy\.com)$/i.test(
          parsedUrl.hostname,
        ) &&
        parsedUrl.pathname.startsWith('/storage/')
      ) {
        return `${window.location.origin}${parsedUrl.pathname}`;
      }

      if (
        isPublicWapRuntime() &&
        (parsedUrl.hostname === '127.0.0.1' ||
          parsedUrl.hostname === 'localhost') &&
        parsedUrl.pathname.startsWith('/storage/')
      ) {
        return `${window.location.origin}${parsedUrl.pathname}`;
      }
    } catch (error) {
      console.error(error);
    }

    return trimmed;
  }

  if (trimmed.startsWith('/storage/')) {
    return resolveStorageImageUrl(trimmed);
  }

  return resolveStorageImageUrl(trimmed);
};

const safeString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value).trim() || fallback;
};

const safeLower = (value: unknown, fallback: string): string => {
  return safeString(value, fallback).toLowerCase();
};

const toProductNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const mapStorefrontProductToProduct = (
  item: StorefrontProduct,
  index: number,
): ProductType => {
  const fallbackImage = DEFAULT_CATALOG_IMAGE;
  const gallery = [
    resolveCatalogImageUrl(item.primaryImageUrl),
    ...(Array.isArray(item.imageUrls)
      ? item.imageUrls.map(imageUrl => resolveCatalogImageUrl(imageUrl))
      : []),
  ].filter((value, imageIndex, array): value is string => {
    return Boolean(value) && array.indexOf(value) === imageIndex;
  });
  const image = gallery[0] || fallbackImage;
  const homeImage = resolveCatalogImageUrl(item.homeCardImageUrl) || image;
  const categoryCode = safeString(item.categoryCode, 'uncategorized');
  const supplierCode = safeString(item.supplierCode, 'catalog');
  const productName = safeString(item.name || item.productName, 'Product');
  const categoryName = safeString(item.categoryName, 'Products');
  const supplierName = safeString(item.supplierName, 'Catalog');
  const salesChannelMode = safeString(
    item.salesChannelMode,
    'WAP_CATALOG',
  ).toUpperCase();

  return {
    id: toProductNumber(item.productDetailId || item.productId),
    productDetailId: safeString(item.productDetailId || item.productId),
    productCode: safeString(item.productCode || item.code),
    categoryCode,
    categoryName,
    supplierCode,
    supplierName,
    name: productName,
    price: toProductNumber(item.memberPriceUsdt),
    pv: toProductNumber(item.pv),
    firmRedemptionEligible: Boolean(item.firmRedemptionEligible),
    salesChannelMode,
    showOnHome: salesChannelMode === 'WAP_CATALOG',
    dcwSpendEnabled: Boolean(item.dcwSpendEnabled),
    dcwUsageAmount: toProductNumber(item.dcwUsageAmount),
    dcwRewardRate: Number(
      item.dcwRewardRate ||
        item.dcwCashRewardRate ||
        item.dcwShoppingRewardRate ||
        0,
    ),
    rating: toProductNumber(item.ratingAvg) || 5,
    ratingCount: toProductNumber(item.ratingCount),
    status: safeString(item.status, 'active'),
    image,
    homeImage,
    images: gallery.length ? gallery : [image],
    sizes: ['standard'],
    size: 'standard',
    colors: [{name: 'default', code: '#1F2937'}],
    color: 'default',
    shortDescription: safeString(item.shortDescription) || undefined,
    youtubeUrl: safeString(item.youtubeUrl) || undefined,
    description:
      safeString(item.description) ||
      safeString(item.shortDescription) ||
      `${productName} by ${supplierName}.`,
    categories: categoryName,
    is_bestseller: Boolean(item.isBestSeller),
    is_featured: Boolean(item.isFeatured),
    is_out_of_stock: safeString(item.status, 'active') !== 'active',
    quantity: 0,
    reviews: [],
    types: ['product'],
    isNew: Boolean(item.isNew),
    isTop: Boolean(item.isTop),
    isFeatured: Boolean(item.isFeatured),
    audience: ['all'],
    promotion: categoryName,
    tags: [safeLower(item.categoryCode, 'uncategorized'), safeLower(item.supplierCode, 'catalog')],
  };
};

const mapBasicProductToProduct = (
  item: BasicProduct,
  index: number,
): ProductType => {
  const fallbackImage = DEFAULT_CATALOG_IMAGE;
  const id = safeString(item.productId, String(index + 1));
  const categoryCode = safeString(item.categoryCode, 'catalog');
  const supplierCode = safeString(item.supplierCode, 'catalog');
  const name = safeString(item.name, safeString(item.code, 'Product'));

  return {
    id: toProductNumber(id || index + 1),
    productDetailId: id,
    productCode: safeString(item.code, id),
    categoryCode,
    categoryName: safeString(item.categoryCode, 'Products'),
    supplierCode,
    supplierName: safeString(item.supplierCode, 'Catalog'),
    name,
    price: 0,
    pv: 0,
    rating: 5,
    ratingCount: 0,
    status: safeString(item.status, 'active'),
    image: fallbackImage,
    homeImage: fallbackImage,
    images: [fallbackImage],
    sizes: ['standard'],
    size: 'standard',
    colors: [{name: 'default', code: '#1F2937'}],
    color: 'default',
    description: `${name} is available in the live catalog.`,
    categories: safeString(item.categoryCode, 'Products'),
    is_bestseller: false,
    is_featured: false,
    is_out_of_stock: safeString(item.status, 'active') !== 'active',
    quantity: 0,
    reviews: [],
    types: ['product'],
    isNew: false,
    isTop: false,
    isFeatured: false,
    audience: ['all'],
    promotion: safeString(item.categoryCode, 'Products'),
    tags: [safeLower(item.categoryCode, 'catalog'), safeLower(item.supplierCode, 'catalog')],
  };
};

const getListPayload = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.items)) {
      return record.items as T[];
    }
    if (Array.isArray(record.data)) {
      return record.data as T[];
    }
  }

  return [];
};

const getPreferredStorefrontUrls = (): string[] => {
  const urls: string[] = [];

  if (isPublicWapRuntime() && typeof window !== 'undefined') {
    urls.push(`${window.location.origin}/api/packages/storefront-products`);
  }

  urls.push(URLS.GET_STOREFRONT_PRODUCTS);

  const alternateStorefrontUrl = `${URLS.API_BASE_URL}/packages/storefront-products`;
  if (!urls.includes(alternateStorefrontUrl)) {
    urls.push(alternateStorefrontUrl);
  }

  return urls;
};

export const isFirmHiddenProduct = (
  product?: Pick<ProductType, 'categoryCode' | 'firmRedemptionEligible'> | null,
): boolean => {
  const categoryCode = String(product?.categoryCode || '').trim().toLowerCase();
  return categoryCode === 'firm';
};

export const fetchLiveProducts = async (): Promise<ProductType[]> => {
  let storefrontError: unknown;

  for (const storefrontUrl of getPreferredStorefrontUrls()) {
    try {
      const response = await axios.get(storefrontUrl, {
        timeout: 15000,
      });
      const items = getListPayload<StorefrontProduct>(response.data);
      const mapped = items.reduce<ProductType[]>((result, item, index) => {
        try {
          if (safeString(item?.status, 'active') !== 'active') {
            return result;
          }

          const mappedProduct = mapStorefrontProductToProduct(item, index);
          if (isFirmHiddenProduct(mappedProduct)) {
            return result;
          }

          result.push(mappedProduct);
        } catch (error) {
          console.warn('Skipping malformed storefront product', item, error);
        }

        return result;
      }, []);

      if (mapped.length > 0) {
        return mapped;
      }
    } catch (error) {
      storefrontError = error;
      console.error(
        `Unable to load storefront products from ${storefrontUrl}.`,
        error,
      );
    }
  }

  const fallbackResponse = await axios.get(`${URLS.API_BASE_URL}/products`, {
    timeout: 15000,
  });
  const fallbackItems = getListPayload<BasicProduct>(fallbackResponse.data);
  const fallbackMapped = fallbackItems
    .filter(item => safeString(item?.status, 'active') === 'active')
    .map((item, index) => mapBasicProductToProduct(item, index))
    .filter(item => !isFirmHiddenProduct(item));

  if (fallbackMapped.length > 0) {
    return fallbackMapped;
  }

  throw storefrontError || new Error('Unable to load products from storefront or fallback catalog.');
};

export const fetchCategoryImageMap = async (): Promise<Record<string, string>> => {
  const response = await axios.get(URLS.GET_CATEGORIES, {
    timeout: 15000,
  });
  const items = getListPayload<CatalogCategory>(response.data);

  return items.reduce<Record<string, string>>((result, item) => {
    const code = safeString(item.code).toLowerCase();
    const rawImage = safeString(item.image) || safeString(item.imageUrl);
    const image =
      rawImage.startsWith('data:image/')
        ? ''
        : resolveCatalogImageUrl(rawImage);

    if (code && image) {
      result[code] = image;
    }

    return result;
  }, {});
};

export const getProductCollections = (
  products: ProductType[],
  categoryImageMap: Record<string, string> = {},
) => {
  const visibleProducts = products.filter(product => {
    const categoryCode = String(product.categoryCode || '').trim().toLowerCase();
    return categoryCode !== 'firm' && !product.firmRedemptionEligible;
  });

  const normalizeCollectionId = (product: ProductType): string => {
    const categoryCode = String(product.categoryCode || '').trim().toLowerCase();
    return categoryCode || 'uncategorized';
  };

  const resolveCollectionName = (product: ProductType): string => {
    return product.categoryName || 'Products';
  };

  const groupedCollections = new Map<
    string,
    {
      id: string;
      name: string;
      image: string;
      products: ProductType[];
    }
  >();

  visibleProducts.forEach(product => {
    const collectionId = normalizeCollectionId(product);
    const existingCollection = groupedCollections.get(collectionId);

    if (existingCollection) {
      const alreadyIncluded = existingCollection.products.some(
        existing =>
          String(existing.productDetailId || existing.id) ===
          String(product.productDetailId || product.id),
      );

      if (!alreadyIncluded) {
        existingCollection.products.push(product);
      }
      return;
    }

    groupedCollections.set(collectionId, {
      id: collectionId,
      name: resolveCollectionName(product),
      image: categoryImageMap[collectionId] || product.image || DEFAULT_CATALOG_IMAGE,
      products: [product],
    });
  });

  const categoryCollections = Array.from(groupedCollections.values());

  return [
    ...categoryCollections,
    {
      id: 'all',
      name: 'All products',
      image: visibleProducts[0]?.image || DEFAULT_CATALOG_IMAGE,
      products: visibleProducts,
    },
  ].filter(collection => collection.products.length > 0);
};

export const fetchProductCollections = async () => {
  const [products, categoryImageMap] = await Promise.all([
    fetchLiveProducts(),
    fetchCategoryImageMap().catch(() => ({})),
  ]);

  return getProductCollections(products, categoryImageMap);
};
