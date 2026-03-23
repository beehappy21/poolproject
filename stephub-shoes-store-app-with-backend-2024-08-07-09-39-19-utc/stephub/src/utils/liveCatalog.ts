import axios from 'axios';

import {URLS} from '../config';
import {ProductType} from '../types';

type PackageSummary = {
  packageId: string;
  code: string;
  name: string;
  priceUsdt: string;
  pv: string;
  status: string;
  activeDays: number | string;
  itemCount: number | string;
  supplierCode?: string | null;
  supplierName?: string | null;
  categoryCode?: string | null;
  categoryName?: string | null;
  primaryImageUrl?: string | null;
  youtubeUrl?: string | null;
  imageUrls?: string[];
  shortDescription?: string | null;
  description?: string | null;
  audienceTags?: string[];
  ratingAvg?: string;
  ratingCount?: number | string;
  isFeatured?: boolean;
  isNew?: boolean;
  isTop?: boolean;
  packageItems?: Array<{
    packageItemId: string;
    qty: number;
    productDetailId: string;
    productDetailCode: string;
    productDetailName: string;
    primaryImageUrl?: string | null;
    youtubeUrl?: string | null;
    imageUrls?: string[];
    shortDescription?: string | null;
    description?: string | null;
    lineMemberPriceUsdt?: string;
    linePv?: string;
  }>;
};

const PACKAGE_PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=900&q=80',
];

export const mapPackageToProduct = (
  item: PackageSummary,
  index: number,
): ProductType => {
  const packageItems = item.packageItems || [];
  const leadItem = packageItems[0];
  const displayName = leadItem?.productDetailName || item.name;
  const displayCode = leadItem?.productDetailCode || item.code;
  const displayShortDescription = leadItem?.shortDescription || item.shortDescription;
  const displayDescription =
    leadItem?.description ||
    item.description ||
    item.shortDescription ||
    `${displayName} (${displayCode})`;
  const uniqueImages = [
    leadItem?.primaryImageUrl,
    ...(leadItem?.imageUrls || []),
    item.primaryImageUrl,
    ...(item.imageUrls || []),
  ].filter(
    (value, imageIndex, array): value is string =>
      Boolean(value) && array.indexOf(value) === imageIndex,
  );
  const image =
    uniqueImages[0] ||
    PACKAGE_PLACEHOLDER_IMAGES[index % PACKAGE_PLACEHOLDER_IMAGES.length];
  const price = Number(item.priceUsdt || 0);
  const packageItemSummary = packageItems
    .map(
      packageItem =>
        `${packageItem.productDetailName}${packageItem.qty > 1 ? ` x${packageItem.qty}` : ''}`,
    )
    .join(', ');

  return {
    id: Number(item.packageId),
    packageId: item.packageId,
    packageCode: item.code,
    categoryCode: item.categoryCode || undefined,
    categoryName: item.categoryName || undefined,
    supplierCode: item.supplierCode || undefined,
    supplierName: item.supplierName || undefined,
    name: displayName,
    price,
    rating: Number(item.ratingAvg || 0),
    ratingCount: Number(item.ratingCount || 0),
    activeDays: Number(item.activeDays || 0),
    status: item.status,
    itemCount: Number(item.itemCount || 0),
    shortDescription: displayShortDescription || undefined,
    youtubeUrl: leadItem?.youtubeUrl || item.youtubeUrl || undefined,
    packageItems,
    image,
    images: uniqueImages.length ? uniqueImages : [image],
    sizes: ['standard'],
    size: 'standard',
    colors: [{name: 'default', code: '#1F2937'}],
    color: 'default',
    description:
      displayDescription ||
      `${displayName}${packageItemSummary ? `, ${packageItemSummary}` : ''}`,
    categories: item.categoryName || item.supplierName || 'สินค้า',
    is_bestseller: Boolean(item.isTop),
    is_featured: Boolean(item.isFeatured),
    is_out_of_stock: item.status !== 'active',
    quantity: 0,
    reviews: [],
    types: ['package'],
    isNew: Boolean(item.isNew),
    isTop: Boolean(item.isTop),
    isFeatured: Boolean(item.isFeatured),
    audience: item.audienceTags?.length ? item.audienceTags : ['all'],
    promotion: displayCode,
    tags: ['product', (item.categoryCode || '').toLowerCase()].filter(Boolean),
    pv: Number(item.pv || 0),
  };
};

export const fetchLiveProducts = async (): Promise<ProductType[]> => {
  const response = await axios.get(URLS.GET_PACKAGES);
  const items = Array.isArray(response.data) ? response.data : [];

  return items
    .filter((item: PackageSummary) => item.status === 'active')
    .map((item: PackageSummary, index: number) => mapPackageToProduct(item, index));
};

export const getPackageCollections = (products: ProductType[]) => {
  const grouped = new Map<
    string,
    {id: string; name: string; image: string; products: ProductType[]}
  >();

  products.forEach(product => {
    const rawKey =
      product.categoryCode || product.supplierCode || product.packageCode || 'all';
    const key = rawKey.toLowerCase();
    const name =
      product.categoryName || product.supplierName || 'แพ็กเกจทั้งหมด';

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
      name: 'แพ็กเกจทั้งหมด',
      image: products[0]?.image || '',
      products,
    },
  ].filter(collection => collection.products.length > 0);
};
