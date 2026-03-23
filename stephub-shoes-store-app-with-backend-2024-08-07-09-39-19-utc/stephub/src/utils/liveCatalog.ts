import axios from 'axios';

import {URLS} from '../config';
import {ProductType} from '../types';

type StorefrontProduct = {
  productDetailId: string;
  packageId?: string;
  packageCode?: string;
  productId: string;
  productCode: string;
  productName: string;
  categoryCode?: string | null;
  categoryName?: string | null;
  supplierCode?: string | null;
  supplierName?: string | null;
  code: string;
  name: string;
  shortDescription?: string | null;
  description?: string | null;
  primaryImageUrl?: string | null;
  youtubeUrl?: string | null;
  imageUrls?: string[];
  memberPriceUsdt: string;
  retailPriceUsdt?: string;
  pv: string;
  ratingAvg?: string;
  ratingCount?: number | string;
  isFeatured?: boolean;
  isNew?: boolean;
  isTop?: boolean;
  isBestSeller?: boolean;
  status: string;
};

type ProductCategory = {
  categoryId: string;
  code: string;
  name: string;
  status: string;
};

type ProductCollection = {
  id: string;
  name: string;
  image: string;
  products: ProductType[];
};

const PRODUCT_PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=900&q=80',
];

export const mapStorefrontProduct = (
  item: StorefrontProduct,
  index: number,
): ProductType => {
  const uniqueImages = [item.primaryImageUrl, ...(item.imageUrls || [])].filter(
    (value, imageIndex, array): value is string =>
      Boolean(value) && array.indexOf(value) === imageIndex,
  );
  const image =
    uniqueImages[0] ||
    PRODUCT_PLACEHOLDER_IMAGES[index % PRODUCT_PLACEHOLDER_IMAGES.length];

  return {
    id: Number(item.productDetailId),
    productDetailId: item.productDetailId,
    productCode: item.productCode,
    packageId: item.packageId,
    packageCode: item.packageCode,
    categoryCode: item.categoryCode || undefined,
    categoryName: item.categoryName || undefined,
    supplierCode: item.supplierCode || undefined,
    supplierName: item.supplierName || undefined,
    name: item.name,
    price: Number(item.memberPriceUsdt || 0),
    rating: Number(item.ratingAvg || 0),
    ratingCount: Number(item.ratingCount || 0),
    status: item.status,
    itemCount: 1,
    shortDescription: item.shortDescription || undefined,
    youtubeUrl: item.youtubeUrl || undefined,
    image,
    images: uniqueImages.length ? uniqueImages : [image],
    sizes: ['standard'],
    size: 'standard',
    colors: [{name: 'default', code: '#1F2937'}],
    color: 'default',
    description:
      item.description ||
      item.shortDescription ||
      `${item.name} (${item.code})`,
    categories: item.categoryName || item.supplierName || 'สินค้า',
    is_bestseller: Boolean(item.isBestSeller || item.isTop),
    is_featured: Boolean(item.isFeatured),
    is_out_of_stock: item.status !== 'active',
    quantity: 0,
    reviews: [],
    types: ['product'],
    isNew: Boolean(item.isNew),
    isTop: Boolean(item.isTop || item.isBestSeller),
    isFeatured: Boolean(item.isFeatured),
    audience: ['all'],
    promotion: item.productCode || item.code,
    tags: ['product', (item.categoryCode || '').toLowerCase()].filter(Boolean),
    pv: Number(item.pv || 0),
  };
};

export const fetchLiveProducts = async (): Promise<ProductType[]> => {
  const response = await axios.get(URLS.GET_STOREFRONT_PRODUCTS);
  const items = Array.isArray(response.data) ? response.data : [];

  return items
    .filter((item: StorefrontProduct) => item.status === 'active')
    .map((item: StorefrontProduct, index: number) =>
      mapStorefrontProduct(item, index),
    );
};

export const getProductCollections = (products: ProductType[]) => {
  const grouped = new Map<
    string,
    ProductCollection
  >();

  products.forEach(product => {
    const rawKey =
      product.categoryCode || product.supplierCode || product.promotion || 'all';
    const key = rawKey.toLowerCase();
    const name = product.categoryName || product.supplierName || 'สินค้าทั้งหมด';

    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key,
        name,
        image: product.image,
        products: [],
      });
    }

    grouped.get(key)?.products.push(product);
  });

  const collections = Array.from(grouped.values()).sort((left, right) => {
    return right.products.length - left.products.length;
  });

  return [
    ...collections,
    {
      id: 'all',
      name: 'สินค้าทั้งหมด',
      image: products[0]?.image || '',
      products,
    },
  ].filter(collection => collection.products.length > 0);
};

export const fetchProductCollections = async (): Promise<ProductCollection[]> => {
  const [products, categoriesResponse] = await Promise.all([
    fetchLiveProducts(),
    axios.get(URLS.GET_PRODUCT_CATEGORIES),
  ]);

  const categories = Array.isArray(categoriesResponse.data)
    ? (categoriesResponse.data as ProductCategory[])
    : [];

  const groupedProducts = new Map<string, ProductType[]>();
  products.forEach(product => {
    const key = (product.categoryCode || '').toLowerCase();
    if (!key) {
      return;
    }

    if (!groupedProducts.has(key)) {
      groupedProducts.set(key, []);
    }

    groupedProducts.get(key)?.push(product);
  });

  const collections = categories
    .filter(category => category.status === 'active')
    .map(category => {
      const productsInCategory =
        groupedProducts.get(category.code.toLowerCase()) || [];

      return {
        id: category.code.toLowerCase(),
        name: category.name,
        image: productsInCategory[0]?.image || '',
        products: productsInCategory,
      };
    })
    .filter(collection => collection.products.length > 0);

  return [
    ...collections,
    {
      id: 'all',
      name: 'สินค้าทั้งหมด',
      image: products[0]?.image || '',
      products,
    },
  ].filter(collection => collection.products.length > 0);
};
