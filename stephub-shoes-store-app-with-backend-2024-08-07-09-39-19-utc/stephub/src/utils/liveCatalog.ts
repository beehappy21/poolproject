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

const PRODUCT_PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=900&q=80',
];

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
    return `${URLS.BAO_BASE_URL}${trimmed}`;
  }

  return `${URLS.BAO_BASE_URL}/storage/${trimmed.replace(/^\/+/, '')}`;
};

export const mapStorefrontProductToProduct = (
  item: StorefrontProduct,
  index: number,
): ProductType => {
  const fallbackImage =
    PRODUCT_PLACEHOLDER_IMAGES[index % PRODUCT_PLACEHOLDER_IMAGES.length];
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

  return {
    id: Number(item.productDetailId),
    productDetailId: item.productDetailId,
    productCode: item.productCode,
    categoryCode: item.categoryCode,
    categoryName: item.categoryName,
    supplierCode: item.supplierCode,
    supplierName: item.supplierName,
    name: item.name,
    price: Number(item.memberPriceUsdt || 0),
    pv: Number(item.pv || 0),
    firmRedemptionEligible: Boolean(item.firmRedemptionEligible),
    dcwSpendEnabled: Boolean(item.dcwSpendEnabled),
    dcwUsageAmount: Number(item.dcwUsageAmount || 0),
    dcwRewardRate: Number(
      item.dcwRewardRate ||
        item.dcwCashRewardRate ||
        item.dcwShoppingRewardRate ||
        0,
    ),
    rating: Number(item.ratingAvg || 0) || 5,
    ratingCount: Number(item.ratingCount || 0),
    status: item.status,
    image,
    homeImage,
    images: gallery.length ? gallery : [image],
    sizes: ['standard'],
    size: 'standard',
    colors: [{name: 'default', code: '#1F2937'}],
    color: 'default',
    shortDescription: item.shortDescription || undefined,
    youtubeUrl: item.youtubeUrl || undefined,
    description:
      item.description ||
      item.shortDescription ||
      `${item.name} by ${item.supplierName}.`,
    categories: item.categoryName,
    is_bestseller: Boolean(item.isBestSeller),
    is_featured: Boolean(item.isFeatured),
    is_out_of_stock: item.status !== 'active',
    quantity: 0,
    reviews: [],
    types: ['product'],
    isNew: Boolean(item.isNew),
    isTop: Boolean(item.isTop),
    isFeatured: Boolean(item.isFeatured),
    audience: ['all'],
    promotion: item.categoryName,
    tags: [item.categoryCode.toLowerCase(), item.supplierCode.toLowerCase()],
  };
};

export const fetchLiveProducts = async (): Promise<ProductType[]> => {
  const response = await axios.get(URLS.GET_STOREFRONT_PRODUCTS);
  const items = Array.isArray(response.data) ? response.data : [];

  return items
    .filter((item: StorefrontProduct) => item.status === 'active')
    .map((item: StorefrontProduct, index: number) =>
      mapStorefrontProductToProduct(item, index),
    );
};

export const getProductCollections = (products: ProductType[]) => {
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
      image: product.image,
      products: [product],
    });
  });

  const categoryCollections = Array.from(groupedCollections.values());

  return [
    ...categoryCollections,
    {
      id: 'all',
      name: 'All products',
      image: products[0]?.image || '',
      products,
    },
  ].filter(collection => collection.products.length > 0);
};

export const fetchProductCollections = async () => {
  const products = await fetchLiveProducts();
  return getProductCollections(products);
};
