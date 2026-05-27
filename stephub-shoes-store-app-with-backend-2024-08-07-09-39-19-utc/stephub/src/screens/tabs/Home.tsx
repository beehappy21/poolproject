import axios from 'axios';
import {FC, useCallback, useEffect, useMemo, useState} from 'react';

import {URLS} from '../../config';
import {hooks} from '../../hooks';
import {custom} from '../../custom';
import {theme} from '../../constants';
import {actions} from '../../store/actions';
import {product} from '../../product';
import {components} from '../../components';
import {ProductType} from '../../types/ProductType';
import {
  fetchCategoryImageMap,
  fetchLiveProducts,
  getProductCollections,
} from '../../utils/liveCatalog';

type BannerType = {
  image?: string;
  title?: string;
  description?: string;
};

type CategoryCollection = {
  id: string;
  name: string;
  image: string;
  products: ProductType[];
};

type HomeCachePayload = {
  products: ProductType[];
  collections: CategoryCollection[];
};

const PRODUCT_BATCH_SIZE = 20;
const BANNER_INSERT_INTERVAL = 8;
const MOBILE_BREAKPOINT = 768;
const CATEGORY_VISIBLE_COUNT = 5;
const HOME_CACHE_KEY = 'stephub-home-cache-v2';
const LEGACY_HOME_CACHE_KEYS = ['stephub-home-cache-v1'];
const HOME_REQUEST_TIMEOUT_MS = 10000;
const HOME_SLIDE_INTERVAL_MS = 3000;
const HOME_LOADING_FAILSAFE_MS = 12000;
const TOUCH_PUBLIC_INITIAL_PRODUCTS = 6;
const IOS_PUBLIC_INITIAL_PRODUCTS = 4;
const TOUCH_PUBLIC_LOAD_MORE_COUNT = 4;
const IOS_PUBLIC_LOAD_MORE_COUNT = 2;

const BANNER_PLACEHOLDERS: BannerType[] = [
  {
    title: 'Stephub Picks',
    description: 'สินค้าแนะนำสำหรับการเริ่มต้นใช้งานในทุกวัน',
  },
  {
    title: 'Healthy Lifestyle',
    description: 'รวมสินค้าสำหรับดูแลตัวเองและการใช้ชีวิตประจำวัน',
  },
];

const INLINE_IMAGE_PLACEHOLDER =
  'data:image/svg+xml;base64,' +
  btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600"><rect width="100%" height="100%" fill="#F4F6F8"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#94A3B8">Image unavailable</text></svg>',
  );

const isBrowser = typeof window !== 'undefined';
const isPublicWapRuntime = (): boolean =>
  isBrowser &&
  ['blifehealthy.com', 'wap.blifehealthy.com', 'www.blifehealthy.com'].includes(
    window.location.hostname.toLowerCase(),
  );
const isTouchDevice = (): boolean =>
  isBrowser &&
  ('ontouchstart' in window ||
    window.matchMedia?.('(pointer: coarse)').matches ||
    navigator.maxTouchPoints > 0);
const isIosDevice = (): boolean =>
  isBrowser &&
  /iPad|iPhone|iPod/.test(window.navigator.userAgent || '') &&
  !(window as Window & {MSStream?: unknown}).MSStream;

const resolvePublicStorageUrl = (path: string): string => {
  const normalizedPath = path.replace(/^\/+/, '').replace(/^storage\//, '');

  if (
    isBrowser &&
    ['blifehealthy.com', 'wap.blifehealthy.com', 'www.blifehealthy.com'].includes(
      window.location.hostname.toLowerCase(),
    )
  ) {
    return `${window.location.origin}/storage/${normalizedPath}`;
  }

  return `${URLS.BAO_BASE_URL}/storage/${normalizedPath}`;
};

const normalizeBaoMediaUrl = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith('/storage/')) {
    return resolvePublicStorageUrl(trimmed);
  }

  try {
    const parsed = new URL(trimmed);

    if (
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === 'localhost' ||
      parsed.hostname === 'blifehealthy.com' ||
      parsed.hostname === 'bao.blifehealthy.com' ||
      parsed.hostname === 'wap.blifehealthy.com' ||
      parsed.hostname === 'www.blifehealthy.com'
    ) {
      return `${resolvePublicStorageUrl(parsed.pathname)}${parsed.search}`;
    }

    return parsed.toString();
  } catch (_error) {
    return resolvePublicStorageUrl(trimmed);
  }
};

const normalizeBanner = (value: unknown): BannerType | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  return {
    image: normalizeBaoMediaUrl(candidate.image),
    title: typeof candidate.title === 'string' ? candidate.title : undefined,
    description:
      typeof candidate.description === 'string'
        ? candidate.description
        : undefined,
  };
};

const normalizeCarouselItem = (value: unknown): {image?: string} | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const image = normalizeBaoMediaUrl(candidate.image);

  if (!image) {
    return null;
  }

  return {image};
};

const readHomeCache = (): HomeCachePayload | null => {
  if (!isBrowser) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(HOME_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<HomeCachePayload>;
    const products = Array.isArray(parsed?.products) ? parsed.products : [];
    const collections = Array.isArray(parsed?.collections)
      ? parsed.collections
      : [];

    if (products.length === 0) {
      return null;
    }

    return {products, collections};
  } catch (error) {
    console.warn('Unable to read cached Home data.', error);
    return null;
  }
};

const clearLegacyHomeCache = () => {
  if (!isBrowser) {
    return;
  }

  try {
    LEGACY_HOME_CACHE_KEYS.forEach(cacheKey => {
      window.localStorage.removeItem(cacheKey);
    });
  } catch (error) {
    console.warn('Unable to clear legacy Home cache.', error);
  }
};

const writeHomeCache = (payload: HomeCachePayload) => {
  if (!isBrowser) {
    return;
  }

  try {
    window.localStorage.setItem(HOME_CACHE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Unable to write cached Home data.', error);
  }
};

export const Home: FC = () => {
  const dispatch = hooks.useAppDispatch();
  const navigate = hooks.useAppNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>('');
  const [searchValue, setSearchValue] = useState('');
  const [productsData, setProductsData] = useState<ProductType[]>([]);
  const [bannersData, setBannersData] = useState<BannerType[]>([]);
  const [carouselData, setCarouselData] = useState<any[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [categoryCollections, setCategoryCollections] = useState<
    CategoryCollection[]
  >([]);
  const [visibleCount, setVisibleCount] = useState(PRODUCT_BATCH_SIZE);
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1200,
  );

  const isMobile = windowWidth < MOBILE_BREAKPOINT;
  const gridColumns = isMobile ? 2 : 4;
  const publicWapRuntime = isPublicWapRuntime();
  const publicIosMode = publicWapRuntime && isIosDevice();
  const touchOptimizedPublicMode =
    publicWapRuntime && (isMobile || isTouchDevice());
  const lightweightPublicMode = touchOptimizedPublicMode;
  const initialVisibleProductCount = publicIosMode
    ? IOS_PUBLIC_INITIAL_PRODUCTS
    : lightweightPublicMode
    ? TOUCH_PUBLIC_INITIAL_PRODUCTS
    : PRODUCT_BATCH_SIZE;
  const loadMoreProductCount = publicIosMode
    ? IOS_PUBLIC_LOAD_MORE_COUNT
    : lightweightPublicMode
    ? TOUCH_PUBLIC_LOAD_MORE_COUNT
    : PRODUCT_BATCH_SIZE;

  const getData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    setBannersData(current => (current.length ? current : BANNER_PLACEHOLDERS));

    try {
      const [products, categoryImageMap] = await Promise.all([
        fetchLiveProducts(),
        fetchCategoryImageMap().catch(() => ({})),
      ]);
      const homeProducts = products.filter(item => item.showOnHome !== false);
      const collections = getProductCollections(homeProducts, categoryImageMap);
      const visibleCollections = collections.filter(item => item.id !== 'all');

      setProductsData(products);
      setCategoryCollections(visibleCollections);
      setVisibleCount(initialVisibleProductCount);
      writeHomeCache({
        products,
        collections: visibleCollections,
      });
      setLoading(false);

      const [bannersResult, carouselResult] = await Promise.allSettled([
        axios.get(URLS.GET_BANNERS, {
          timeout: HOME_REQUEST_TIMEOUT_MS,
        }),
        axios.get(URLS.GET_CAROUSEL, {
          timeout: HOME_REQUEST_TIMEOUT_MS,
        }),
      ]);

      const bannersResponse =
        bannersResult.status === 'fulfilled' ? bannersResult.value : null;
      const carouselResponse =
        carouselResult.status === 'fulfilled' ? carouselResult.value : null;
      const bannersPayload = bannersResponse?.data;
      const carouselPayload = carouselResponse?.data;

      const banners = Array.isArray(bannersPayload?.banners)
        ? bannersPayload.banners
        : Array.isArray(bannersPayload)
        ? bannersPayload
        : [];

      const slides = Array.isArray(carouselPayload?.slides)
        ? carouselPayload.slides
        : Array.isArray(carouselPayload?.carousel)
        ? carouselPayload.carousel
        : Array.isArray(carouselPayload)
        ? carouselPayload
        : [];
      const normalizedBanners = banners
        .map((item: unknown) => normalizeBanner(item))
        .filter((item: BannerType | null): item is BannerType => Boolean(item));
      const normalizedSlides = slides
        .map((item: unknown) => normalizeCarouselItem(item))
        .filter(
          (item: {image?: string} | null): item is {image?: string} =>
            Boolean(item?.image),
        );

      setBannersData(normalizedBanners.length ? normalizedBanners : BANNER_PLACEHOLDERS);
      setCarouselData(normalizedSlides);
      setActiveSlideIndex(0);
    } catch (error) {
      console.error(error);
      const cachedHomeData = readHomeCache();

      if (cachedHomeData) {
        setProductsData(cachedHomeData.products);
        setCategoryCollections(cachedHomeData.collections);
        setBannersData(BANNER_PLACEHOLDERS);
        setCarouselData([]);
        setActiveSlideIndex(0);
        setVisibleCount(initialVisibleProductCount);
        setLoadError('');
        return;
      }

      setProductsData([]);
      setCategoryCollections([]);
      setBannersData(BANNER_PLACEHOLDERS);
      setCarouselData([]);
      setActiveSlideIndex(0);
      setLoadError(
        'ไม่สามารถโหลดข้อมูลหน้าหลักได้ในขณะนี้ กรุณาตรวจสอบ API, BAO และลองใหม่อีกครั้ง',
      );
    } finally {
      setLoading(false);
    }
  }, [initialVisibleProductCount]);

  useEffect(() => {
    clearLegacyHomeCache();
    getData();
    window.scrollTo(0, 0);
  }, [getData]);

  useEffect(() => {
    if (!loading) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setLoading(false);
      setLoadError(currentError => {
        if (currentError) {
          return currentError;
        }

        if (productsData.length > 0) {
          return '';
        }

        return 'การโหลดหน้าแรกใช้เวลานานกว่าปกติ ระบบจะแสดงข้อมูลเท่าที่มีอยู่ก่อน หากยังไม่ครบสามารถกดโหลดใหม่ได้';
      });
    }, HOME_LOADING_FAILSAFE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [loading, productsData.length]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (publicIosMode || carouselData.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveSlideIndex(current => (current + 1) % carouselData.length);
    }, HOME_SLIDE_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [carouselData, publicIosMode]);

  const filteredProducts = useMemo(() => {
    const homeVisibleProducts = productsData.filter(item => item.showOnHome !== false);
    const keyword = searchValue.trim().toLowerCase();

    if (!keyword) {
      return homeVisibleProducts;
    }

    return homeVisibleProducts.filter(item => {
      const haystack = [
        item.name,
        item.shortDescription,
        item.description,
        item.categoryName,
        item.supplierName,
        item.productCode,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [productsData, searchValue]);

  useEffect(() => {
    setVisibleCount(initialVisibleProductCount);
  }, [initialVisibleProductCount, searchValue]);

  useEffect(() => {
    const handleScroll = () => {
      const remainingHeight =
        document.documentElement.scrollHeight -
        (window.innerHeight + window.scrollY);

      if (
        remainingHeight < 420 &&
        visibleCount < filteredProducts.length
      ) {
        setVisibleCount(current =>
          Math.min(
            current + loadMoreProductCount,
            filteredProducts.length,
          ),
        );
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [filteredProducts.length, loadMoreProductCount, visibleCount]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);

  const displayedBanners = useMemo(() => {
    if (!Array.isArray(bannersData) || bannersData.length === 0) {
      return carouselData.length
        ? carouselData.map(item => ({image: item.image}))
        : BANNER_PLACEHOLDERS;
    }

    const visualBanners = bannersData.filter(item => Boolean(item.image));
    const shuffled = [...(visualBanners.length ? visualBanners : bannersData)];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [
        shuffled[randomIndex],
        shuffled[index],
      ];
    }

    return shuffled;
  }, [bannersData, carouselData]);

  const getBannerForSlot = (slot: number): BannerType | undefined => {
    if (!displayedBanners.length) {
      return undefined;
    }

    return displayedBanners[slot % displayedBanners.length];
  };

  const openCategory = (collection: CategoryCollection) => {
    dispatch(actions.resetFilters());
    navigate('/Shop', {
      state: {
        title: collection.name,
        products: collection.products,
      },
    });
  };

  const renderHeader = (): JSX.Element => {
    return (
      <components.Header
        burger={true}
        basket={true}
        line={true}
        searchValue={searchValue}
        searchPlaceholder='ค้นหาสินค้า'
        onSearchChange={event => setSearchValue(event.target.value)}
      />
    );
  };

  const renderCarousel = (): JSX.Element | null => {
    if (!carouselData.length) {
      return lightweightPublicMode ? renderBannerBlock(0) : null;
    }

    const safeActiveSlideIndex =
      activeSlideIndex >= 0 && activeSlideIndex < carouselData.length
        ? activeSlideIndex
        : 0;
    const activeSlide = carouselData[safeActiveSlideIndex];
    const imageUrl = activeSlide?.image;

    if (!imageUrl) {
      return lightweightPublicMode ? renderBannerBlock(0) : null;
    }

    return (
      <section style={{marginBottom: 22}}>
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: theme.colors.imageBackground,
          }}
        >
          <img
            src={imageUrl}
            alt='Slide'
            onError={event => {
              if (event.currentTarget.src !== INLINE_IMAGE_PLACEHOLDER) {
                event.currentTarget.src = INLINE_IMAGE_PLACEHOLDER;
              }
            }}
            style={{
              width: '100%',
              display: 'block',
              objectFit: 'contain',
              backgroundColor: theme.colors.imageBackground,
            }}
          />
          {carouselData.length > 1 ? (
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 12,
                display: 'flex',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {carouselData.slice(0, 10).map((_, index: number) => (
                <button
                  key={`slide-dot-${index}`}
                  onClick={() => setActiveSlideIndex(index)}
                  aria-label={`Go to slide ${index + 1}`}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    backgroundColor:
                      index === safeActiveSlideIndex
                        ? theme.colors.mainColor
                        : 'rgba(31, 41, 55, 0.22)',
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>
      </section>
    );
  };

  const renderCategories = (): JSX.Element | null => {
    if (!categoryCollections.length) {
      return null;
    }

    const cardWidth = `calc((100% - ${(CATEGORY_VISIBLE_COUNT - 1) * 10}px) / ${CATEGORY_VISIBLE_COUNT})`;

    return (
      <section style={{marginBottom: 26}}>
        <div
          style={{
            overflowX: 'auto',
            paddingBottom: 4,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridAutoFlow: 'column',
              gridAutoColumns: cardWidth,
              gap: 10,
              minWidth: '100%',
            }}
          >
            {categoryCollections.map(collection => (
              <button
                key={collection.id}
                onClick={() => openCategory(collection)}
                style={{
                  padding: 0,
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  color: theme.colors.mainColor,
                }}
              >
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '1 / 1',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    backgroundColor: theme.colors.imageBackground,
                    marginBottom: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {collection.image ? (
                    <img
                      src={collection.image}
                      alt={collection.name}
                      onError={event => {
                        if (event.currentTarget.src !== INLINE_IMAGE_PLACEHOLDER) {
                          event.currentTarget.src = INLINE_IMAGE_PLACEHOLDER;
                        }
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        background:
                          'linear-gradient(135deg, #EEF4FF 0%, #D8E5FF 100%)',
                      }}
                    />
                  )}
                </div>
                <div
                  style={{
                    width: '100%',
                    fontSize: 12,
                    lineHeight: 1.35,
                    color: theme.colors.textColor,
                    ...theme.fonts.Mulish_500Medium,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    minHeight: 32,
                  }}
                >
                  {collection.name}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    );
  };

  const renderBannerBlock = (slot: number): JSX.Element | null => {
    const banner = getBannerForSlot(slot);

    if (!banner) {
      return null;
    }

    if (banner.image) {
      return (
        <button
          onClick={() => {
            dispatch(actions.resetFilters());
            navigate('/Shop', {
              state: {products: filteredProducts, title: 'สินค้า'},
            });
          }}
          style={{
            width: '100%',
            padding: 0,
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            marginBottom: 24,
          }}
        >
          <img
            src={banner.image}
            alt='Banner'
            onError={event => {
              if (event.currentTarget.src !== INLINE_IMAGE_PLACEHOLDER) {
                event.currentTarget.src = INLINE_IMAGE_PLACEHOLDER;
              }
            }}
            style={{
              width: '100%',
              display: 'block',
              borderRadius: 0,
            }}
          />
        </button>
      );
    }

    return (
      <div
        style={{
          width: '100%',
          minHeight: 180,
          background:
            'linear-gradient(135deg, #1B4DFF 0%, #4F46E5 48%, #7C3AED 100%)',
          padding: '34px 28px',
          color: theme.colors.white,
          marginBottom: 24,
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: 14,
            fontSize: 28,
            lineHeight: 1.15,
            ...theme.fonts.Mulish_700Bold,
          }}
        >
          {banner.title}
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 16,
            lineHeight: 1.6,
            maxWidth: 360,
            color: 'rgba(255,255,255,0.92)',
            ...theme.fonts.Mulish_400Regular,
          }}
        >
          {banner.description}
        </p>
      </div>
    );
  };

  const renderProductCard = (item: ProductType): JSX.Element => {
    const homeImage = item.homeImage || item.image;
    const openProduct = () => navigate('/product', {state: {item}});

    return (
      <div
        key={`${item.productDetailId || item.id}`}
        role='button'
        tabIndex={0}
        onClick={openProduct}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openProduct();
          }
        }}
        style={{
          padding: 0,
          border: 'none',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        <custom.ImageBackground
          imageUrl={homeImage}
          style={{
            width: '100%',
            aspectRatio: '1 / 1',
            borderRadius: 0,
            marginBottom: 10,
            position: 'relative',
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundColor: theme.colors.imageBackground,
            overflow: 'hidden',
          }}
        >
          {!lightweightPublicMode ? (
            <>
              <product.ProductInWishlist
                item={item}
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  padding: 10,
                }}
              />
              <product.ProductInCart
                item={item}
                style={{
                  position: 'absolute',
                  top: 40,
                  right: 0,
                  padding: 10,
                }}
              />
            </>
          ) : null}
        </custom.ImageBackground>

        {!lightweightPublicMode ? (
          <div style={{marginBottom: 4}}>
            <product.ProductRating
              rating={item.rating}
              ratingCount={item.ratingCount}
            />
          </div>
        ) : null}

        <div
          style={{
            fontSize: 14,
            lineHeight: 1.45,
            color: theme.colors.textColor,
            ...theme.fonts.Mulish_400Regular,
            marginBottom: 4,
            minHeight: 42,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {item.name}
        </div>

        <product.ProductPrice item={item} />
      </div>
    );
  };

  const renderProductGrid = (): JSX.Element | null => {
    if (!visibleProducts.length) {
      return null;
    }

    const blocks: JSX.Element[] = [];

    visibleProducts.forEach((item, index) => {
      if (
        !lightweightPublicMode &&
        index > 0 &&
        index % BANNER_INSERT_INTERVAL === 0
      ) {
        blocks.push(
          <div
            key={`banner-${index}`}
            style={{gridColumn: `span ${gridColumns}`}}
          >
            {renderBannerBlock(index / BANNER_INSERT_INTERVAL)}
          </div>,
        );
      }

      blocks.push(renderProductCard(item));
    });

    return (
      <section>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
            gap: 18,
          }}
        >
          {blocks}
        </div>
      </section>
    );
  };

  const renderEmptyState = (): JSX.Element => {
    return (
      <main
        style={{
          paddingTop: 0,
          paddingBottom: 96,
          paddingLeft: 20,
          paddingRight: 20,
        }}
      >
        <div
          style={{
            backgroundColor: theme.colors.ghostWhite,
            padding: 24,
            lineHeight: 1.7,
            color: theme.colors.textColor,
          }}
        >
          ยังไม่มีสินค้าแสดงผลในขณะนี้ กรุณากลับมาตรวจสอบอีกครั้งภายหลัง
        </div>
      </main>
    );
  };

  const renderLoadErrorState = (): JSX.Element => {
    return (
      <main
        style={{
          paddingTop: 0,
          paddingBottom: 96,
          paddingLeft: 20,
          paddingRight: 20,
        }}
      >
        <div
          style={{
            backgroundColor: '#FFF4D6',
            padding: 24,
            lineHeight: 1.7,
            color: theme.colors.mainColor,
            marginBottom: 16,
          }}
        >
          {loadError}
        </div>
        <button
          onClick={() => {
            getData();
          }}
          style={{
            width: '100%',
            border: 'none',
            backgroundColor: theme.colors.mainColor,
            color: theme.colors.mainYellow,
            height: 50,
            cursor: 'pointer',
            borderRadius: 12,
            textTransform: 'capitalize',
            ...theme.fonts.Mulish_900Black,
          }}
        >
          โหลดข้อมูลอีกครั้ง
        </button>
      </main>
    );
  };

  const renderContent = (): JSX.Element => {
    if (loadError && !productsData.length) {
      return renderLoadErrorState();
    }

    if (!productsData.length && !loading) {
      return renderEmptyState();
    }

    return (
      <main
        style={{
          paddingTop: 0,
          paddingBottom: 92,
          paddingLeft: 20,
          paddingRight: 20,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {loading ? (
          <div
            style={{
              marginBottom: 16,
              padding: '14px 16px',
              backgroundColor: '#EEF5FF',
              color: theme.colors.mainColor,
              lineHeight: 1.6,
              ...theme.fonts.Mulish_400Regular,
            }}
          >
            กำลังโหลดข้อมูลหน้าแรก...
          </div>
        ) : null}
        {loadError && productsData.length ? (
          <div
            style={{
              marginBottom: 16,
              padding: '14px 16px',
              backgroundColor: '#FFF4D6',
              color: theme.colors.mainColor,
              lineHeight: 1.6,
              ...theme.fonts.Mulish_400Regular,
            }}
          >
            {loadError}
          </div>
        ) : null}
        {renderCarousel()}
        {renderCategories()}
        {renderBannerBlock(0)}
        {renderProductGrid()}
      </main>
    );
  };

  return (
    <div style={{backgroundColor: theme.colors.white, minHeight: '100vh'}}>
      {renderHeader()}
      {renderContent()}
    </div>
  );
};
