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
  id?: string | number;
  code?: string;
  name?: string;
  image?: string;
  imageUrl?: string;
};

const DEFAULT_CATALOG_IMAGE = '/16.png';

const isPublicWapRuntime = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const hostname = window.location.hostname.toLowerCase();
  return (
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

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('blob:')
  ) {
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
  _index: number,
): ProductType => {
  const gallery = [
    resolveCatalogImageUrl(item.primaryImageUrl),
    ...(Array.isArray(item.imageUrls)
      ? item.imageUrls.map(imageUrl => resolveCatalogImageUrl(imageUrl))
      : []),
  ].filter((value, imageIndex, array): value is string => {
    return Boolean(value) && array.indexOf(value) === imageIndex;
  });
  const image = gallery[0] || DEFAULT_CATALOG_IMAGE;
  const homeImage = resolveCatalogImageUrl(item.homeCardImageUrl) || image;
  const categoryCode = safeString(item.categoryCode, 'uncategorized');
  const supplierCode = safeString(item.supplierCode, 'catalog');
  const productName = safeString(item.name || item.productName, 'Product');
  const categoryName = safeString(item.categoryName, 'Products');
  const supplierName = safeString(item.supplierName, 'Catalog');

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
    image: DEFAULT_CATALOG_IMAGE,
    homeImage: DEFAULT_CATALOG_IMAGE,
    images: [DEFAULT_CATALOG_IMAGE],
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

export const fetchCategoryImageMap = async (): Promise<Record<string, string>> => {
  try {
    const response = await axios.get(URLS.GET_CATEGORIES, {
      timeout: 15000,
    });
    const categories = getListPayload<CatalogCategory>(response.data);

    return categories.reduce<Record<string, string>>((result, category) => {
      const categoryCode = safeString(category.code).toLowerCase();
      const image =
        resolveCatalogImageUrl(category.imageUrl) ||
        resolveCatalogImageUrl(category.image) ||
        '';

      if (categoryCode && image) {
        result[categoryCode] = image;
      }

      return result;
    }, {});
  } catch (error) {
    console.error('Unable to load category images, using default image fallback.', error);
    return {};
  }
};

export const fetchLiveProducts = async (): Promise<ProductType[]> => {
  let storefrontError: unknown;

  try {
    const response = await axios.get(URLS.GET_STOREFRONT_PRODUCTS, {
      timeout: 15000,
    });
    const items = getListPayload<StorefrontProduct>(response.data);
    const mapped = items.reduce<ProductType[]>((result, item, index) => {
      try {
        if (safeString(item?.status, 'active') !== 'active') {
          return result;
        }

        result.push(mapStorefrontProductToProduct(item, index));
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
    console.error('Unable to load storefront products, falling back to basic catalog.', error);
  }

  const fallbackResponse = await axios.get(`${URLS.API_BASE_URL}/products`, {
    timeout: 15000,
  });
  const fallbackItems = getListPayload<BasicProduct>(fallbackResponse.data);
  const fallbackMapped = fallbackItems
    .filter(item => safeString(item?.status, 'active') === 'active')
    .map((item, index) => mapBasicProductToProduct(item, index));

  if (fallbackMapped.length > 0) {
    return fallbackMapped;
  }

  throw storefrontError || new Error('Unable to load products from storefront or fallback catalog.');
};

export const getProductCollections = (
  products: ProductType[],
  categoryImageMap: Record<string, string> = {},
) => {
  const normalizeCollectionId = (product: ProductType): string => {
    const categoryCode = String(product.categoryCode || '').trim().toLowerCase();
    if (categoryCode === 'firm' || product.firmRedemptionEligible) {
      return 'firm';
    }

    return categoryCode || 'uncategorized';
  };

  const resolveCollectionName = (product: ProductType): string => {
    const categoryCode = String(product.categoryCode || '').trim().toLowerCase();
    if (categoryCode === 'firm' || product.firmRedemptionEligible) {
      return 'Firm Catalog';
    }

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

  products.forEach(product => {
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
      image: products[0]?.image || DEFAULT_CATALOG_IMAGE,
      products,
    },
  ].filter(collection => collection.products.length > 0);
};

export const fetchProductCollections = async () => {
  const [products, categoryImageMap] = await Promise.all([
    fetchLiveProducts(),
    fetchCategoryImageMap(),
  ]);
  return getProductCollections(products, categoryImageMap);
};
