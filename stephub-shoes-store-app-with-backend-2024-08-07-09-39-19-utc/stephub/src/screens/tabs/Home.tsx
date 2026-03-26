import axios from 'axios';
import {Carousel} from 'react-responsive-carousel';
import {FC, useEffect, useMemo, useState} from 'react';
import 'react-responsive-carousel/lib/styles/carousel.min.css';

import {URLS} from '../../config';
import {hooks} from '../../hooks';
import {custom} from '../../custom';
import {theme} from '../../constants';
import {actions} from '../../store/actions';
import {product} from '../../product';
import {components} from '../../components';
import {ProductType} from '../../types/ProductType';
import {
  fetchLiveProducts,
  fetchProductCollections,
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

const PRODUCT_BATCH_SIZE = 20;
const BANNER_INSERT_INTERVAL = 8;
const MOBILE_BREAKPOINT = 768;
const CATEGORY_VISIBLE_COUNT = 5;
const HOME_HEADER_HEIGHT = 64;

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

export const Home: FC = () => {
  const dispatch = hooks.useAppDispatch();
  const navigate = hooks.useAppNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>('');
  const [searchValue, setSearchValue] = useState('');
  const [productsData, setProductsData] = useState<ProductType[]>([]);
  const [bannersData, setBannersData] = useState<BannerType[]>([]);
  const [carouselData, setCarouselData] = useState<any[]>([]);
  const [categoryCollections, setCategoryCollections] = useState<
    CategoryCollection[]
  >([]);
  const [visibleCount, setVisibleCount] = useState(PRODUCT_BATCH_SIZE);
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1200,
  );

  const isMobile = windowWidth < MOBILE_BREAKPOINT;
  const gridColumns = isMobile ? 2 : 4;

  const getData = async () => {
    setLoading(true);
    setLoadError('');

    try {
      const [productsResult, collectionsResult, bannersResult, carouselResult] =
        await Promise.allSettled([
          fetchLiveProducts(),
          fetchProductCollections(),
          axios.get(URLS.GET_BANNERS),
          axios.get(URLS.GET_CAROUSEL),
        ]);

      if (productsResult.status !== 'fulfilled') {
        throw new Error('Unable to load storefront products.');
      }

      const products = productsResult.value;
      const collections =
        collectionsResult.status === 'fulfilled' ? collectionsResult.value : [];
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

      setProductsData(products);
      setCategoryCollections(collections.filter(item => item.id !== 'all'));
      setBannersData(banners.length ? banners : BANNER_PLACEHOLDERS);
      setCarouselData(slides);
      setVisibleCount(PRODUCT_BATCH_SIZE);
    } catch (error) {
      console.error(error);
      setProductsData([]);
      setCategoryCollections([]);
      setBannersData(BANNER_PLACEHOLDERS);
      setCarouselData([]);
      setLoadError(
        'ไม่สามารถโหลดข้อมูลหน้าหลักได้ในขณะนี้ กรุณาตรวจสอบ API, BAO และลองใหม่อีกครั้ง',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getData();
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filteredProducts = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();

    if (!keyword) {
      return productsData;
    }

    return productsData.filter(item => {
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
    setVisibleCount(PRODUCT_BATCH_SIZE);
  }, [searchValue]);

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
          Math.min(current + PRODUCT_BATCH_SIZE, filteredProducts.length),
        );
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [filteredProducts.length, visibleCount]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);

  const displayedBanners = useMemo(() => {
    if (!Array.isArray(bannersData) || bannersData.length === 0) {
      return BANNER_PLACEHOLDERS;
    }

    const shuffled = [...bannersData];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [
        shuffled[randomIndex],
        shuffled[index],
      ];
    }

    return shuffled;
  }, [bannersData]);

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
      return null;
    }

    return (
      <section style={{marginBottom: 22}}>
        <Carousel
          autoPlay={true}
          interval={3000}
          infiniteLoop={true}
          stopOnHover={false}
          showStatus={false}
          showThumbs={false}
          showIndicators={false}
          showArrows={false}
          swipeable={true}
          emulateTouch={true}
        >
          {carouselData.slice(0, 10).map((item: any, index: number) => {
            const imageUrl = item?.image;
            return (
              <div key={index} style={{backgroundColor: theme.colors.imageBackground}}>
                <img
                  src={imageUrl}
                  alt='Slide'
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    objectFit: 'contain',
                    backgroundColor: theme.colors.imageBackground,
                  }}
                />
              </div>
            );
          })}
        </Carousel>
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
    return (
      <button
        key={`${item.productDetailId || item.id}`}
        onClick={() => navigate('/product', {state: {item}})}
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
          imageUrl={item.image}
          style={{
            width: '100%',
            aspectRatio: '1 / 1',
            borderRadius: 0,
            marginBottom: 10,
            position: 'relative',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: theme.colors.imageBackground,
            overflow: 'hidden',
          }}
        >
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
        </custom.ImageBackground>

        <div style={{marginBottom: 4}}>
          <product.ProductRating
            rating={item.rating}
            ratingCount={item.ratingCount}
          />
        </div>

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
      </button>
    );
  };

  const renderProductGrid = (): JSX.Element | null => {
    if (!visibleProducts.length) {
      return null;
    }

    const blocks: JSX.Element[] = [];

    visibleProducts.forEach((item, index) => {
      if (index > 0 && index % BANNER_INSERT_INTERVAL === 0) {
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
          paddingTop: HOME_HEADER_HEIGHT + 16,
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
          paddingTop: HOME_HEADER_HEIGHT + 16,
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
    if (loading) {
      return <components.TabLoader />;
    }

    if (loadError) {
      return renderLoadErrorState();
    }

    if (!productsData.length) {
      return renderEmptyState();
    }

    return (
      <main
        style={{
          paddingTop: HOME_HEADER_HEIGHT + 14,
          paddingBottom: 92,
          paddingLeft: 20,
          paddingRight: 20,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
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
      <components.BottomTabBar />
    </div>
  );
};
