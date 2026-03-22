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
  const image =
    PACKAGE_PLACEHOLDER_IMAGES[index % PACKAGE_PLACEHOLDER_IMAGES.length];
  const price = Number(item.priceUsdt || 0);

  return {
    id: Number(item.packageId),
    packageId: item.packageId,
    packageCode: item.code,
    name: item.name,
    price,
    rating: 5,
    ratingCount: 0,
    activeDays: Number(item.activeDays || 0),
    status: item.status,
    itemCount: Number(item.itemCount || 0),
    image,
    images: [image],
    sizes: ['standard'],
    size: 'standard',
    colors: [{name: 'default', code: '#1F2937'}],
    color: 'default',
    description: `${item.name} package (${item.code}) with ${item.pv} PV and ${item.priceUsdt} USDT price.`,
    categories: 'Packages',
    is_bestseller: index < 6,
    is_featured: index < 6,
    is_out_of_stock: item.status !== 'active',
    quantity: 0,
    reviews: [],
    types: ['package'],
    isNew: index < 3,
    isTop: index < 6,
    isFeatured: index < 6,
    audience: ['all'],
    promotion: item.code,
    tags: ['package'],
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
  const starter = products.filter(product =>
    (product.packageCode || '').toUpperCase().includes('STARTER'),
  );
  const basic = products.filter(product =>
    (product.packageCode || '').toUpperCase().includes('BASIC'),
  );
  const smoke = products.filter(product =>
    (product.packageCode || '').toUpperCase().includes('SMOKE'),
  );

  return [
    {
      id: 'starter',
      name: 'Starter packages',
      image: starter[0]?.image || products[0]?.image || '',
      products: starter,
    },
    {
      id: 'basic',
      name: 'Basic packages',
      image: basic[0]?.image || products[1]?.image || products[0]?.image || '',
      products: basic,
    },
    {
      id: 'smoke',
      name: 'New packages',
      image: smoke[0]?.image || products[2]?.image || products[0]?.image || '',
      products: smoke,
    },
    {
      id: 'all',
      name: 'All packages',
      image: products[0]?.image || '',
      products,
    },
  ].filter(collection => collection.products.length > 0);
};
