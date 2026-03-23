import axios from 'axios';
import {useState} from 'react';
import {useEffect, FC} from 'react';
import {Carousel} from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';

import {URLS} from '../../config';
import {hooks} from '../../hooks';
import {product} from '../../product';
import {custom} from '../../custom';
import {theme} from '../../constants';
import {actions} from '../../store/actions';
import {components} from '../../components';
import {fetchLiveProducts} from '../../utils/liveCatalog';

const INITIAL_RECOMMENDED_LIMIT = 20;
const BANNER_INSERT_INTERVAL = 8;

const shuffleArray = <T,>(items: T[]): T[] => {
  const cloned = [...items];

  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [cloned[index], cloned[randomIndex]] = [cloned[randomIndex], cloned[index]];
  }

  return cloned;
};

export const Home: FC = () => {
  const dispatch = hooks.useAppDispatch();
  const navigate = hooks.useAppNavigate();
  const {width} = hooks.useWindowSize();

  const [loading, setLoading] = useState<boolean>(true);
  const [searchValue, setSearchValue] = useState('');

  const [productsData, setProductsData] = useState<any>([]);
  const [categoriesData, setCategoriesData] = useState<any>([]);
  const [bannersData, setBannersData] = useState<any>([]);
  const [carouselData, setCarouselData] = useState<any>([]);
  const [recommendedVisibleCount, setRecommendedVisibleCount] = useState<number>(
    INITIAL_RECOMMENDED_LIMIT,
  );

  useEffect(() => {
    const handleScroll = () => {
      const scrollBottom = window.innerHeight + window.scrollY;
      const threshold = document.documentElement.scrollHeight - 240;

      if (scrollBottom < threshold) return;

      setRecommendedVisibleCount(current => {
        if (current >= productsData.length) return current;
        return Math.min(current + INITIAL_RECOMMENDED_LIMIT, productsData.length);
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [productsData.length]);

  const getData = async () => {
    setLoading(true);

    try {
      const products = await fetchLiveProducts();
      const categories = await axios
        .get(URLS.GET_CATEGORIES)
        .then(res => (Array.isArray(res.data) ? res.data : []));

      const banners = await axios
        .get(URLS.GET_BANNERS)
        .then(res => (Array.isArray(res.data) ? res.data : res.data.banners || []));

      const carousel = await axios
        .get(URLS.GET_CAROUSEL)
        .then(res => (Array.isArray(res.data) ? res.data : res.data.carousel || []));

      setProductsData(products);
      setCategoriesData(categories);
      setBannersData(shuffleArray(banners));
      setCarouselData(carousel);
      setRecommendedVisibleCount(INITIAL_RECOMMENDED_LIMIT);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getData();
    window.scrollTo(0, 0);
  }, []);

  const renderHeader = (): JSX.Element => {
    return (
      <components.Header
        burger={true}
        basket={true}
        line={true}
        fixed={true}
        searchValue={searchValue}
        searchPlaceholder='ค้นหาแพ็กเกจ'
        onSearchChange={(event) => setSearchValue(event.target.value)}
      />
    );
  };

  const getBannerForSlot = (slotIndex: number) => {
    if (!Array.isArray(bannersData) || bannersData.length === 0) {
      return null;
    }

    return bannersData[slotIndex % bannersData.length] || null;
  };

  const renderCarousel = (): JSX.Element => {
    return (
      <div style={{marginBottom: 22}}>
        <Carousel
          autoPlay={true}
          interval={3000}
          infiniteLoop={true}
          showStatus={false}
          showThumbs={false}
          thumbWidth={22}
          showIndicators={false}
          showArrows={false}
          stopOnHover={false}
          swipeable={true}
          emulateTouch={true}
        >
          {carouselData?.slice(0, 10).map((item: any, index: any) => {
            return (
              <img
                key={index}
                src={item.image}
                alt='Carousel'
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  backgroundColor: theme.colors.imageBackground,
                }}
              />
            );
          })}
        </Carousel>
      </div>
    );
  };

  const renderBestSellers = (): JSX.Element => {
    const normalizedSearch = searchValue.trim().toLowerCase();
    const searchableProducts = normalizedSearch
      ? productsData.filter((item: any) => {
          const candidate = [
            item.name,
            item.packageCode,
            item.categoryName,
            item.supplierName,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          return candidate.includes(normalizedSearch);
        })
      : productsData;
    const popularPackages = searchableProducts.filter(
      (item: any) => item.isTop || item.isFeatured,
    );
    const displayPackages = popularPackages.length
      ? popularPackages
      : searchableProducts;
    const columns = width >= 1024 ? 4 : 2;
    const visiblePackages = displayPackages.slice(0, recommendedVisibleCount);
    const packageGroups = [];

    for (let index = 0; index < visiblePackages.length; index += BANNER_INSERT_INTERVAL) {
      packageGroups.push(
        visiblePackages.slice(index, index + BANNER_INSERT_INTERVAL),
      );
    }

    return (
      <div style={{marginBottom: 40, display: 'flex', flexDirection: 'column'}}>
        {packageGroups.map((group: any[], groupIndex: number) => {
          return (
            <div key={`group-${groupIndex}`} style={{display: 'flex', flexDirection: 'column'}}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  gap: 16,
                  padding: '0 20px',
                }}
              >
                {group.map((item: any) => {
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate('/product', {state: {item}})}
                      style={{
                        textAlign: 'left',
                        backgroundColor: 'transparent',
                      }}
                    >
                      <custom.ImageBackground
                        imageUrl={item.image}
                        style={{
                          width: '100%',
                          aspectRatio: '4 / 5',
                          borderRadius: 0,
                          marginBottom: 8,
                          position: 'relative',
                          backgroundSize: 'contain',
                          backgroundColor: theme.colors.imageBackground,
                        }}
                      >
                        <product.ProductInWishlist
                          item={item}
                          style={{
                            position: 'absolute',
                            padding: 10,
                            right: 0,
                          }}
                        />
                        <product.ProductInCart
                          item={item}
                          style={{
                            position: 'absolute',
                            right: 0,
                            top: 40,
                            padding: 10,
                          }}
                        />
                      </custom.ImageBackground>
                      <div style={{display: 'flex', flexDirection: 'column', minWidth: 0}}>
                        <div style={{marginBottom: 4}}>
                          <product.ProductRating
                            rating={item.rating}
                            ratingCount={item.ratingCount}
                          />
                        </div>
                        <h6
                          style={{
                            marginTop: 0,
                            marginBottom: 6,
                            color: theme.colors.textColor,
                            ...theme.fonts.Mulish_400Regular,
                            fontSize: 14,
                            lineHeight: 1.45,
                            fontWeight: 400,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {item.name}
                        </h6>
                        <product.ProductPrice item={item} />
                      </div>
                    </button>
                  );
                })}
              </div>
              {group.length === BANNER_INSERT_INTERVAL &&
                groupIndex < packageGroups.length - 1 &&
                getBannerForSlot(groupIndex + 1)?.image && (
                  <div style={{padding: '20px 20px 0'}}>
                    <button
                      onClick={() => {
                        dispatch(actions.resetFilters());
                        navigate('/Shop', {
                          state: {products: displayPackages, title: 'สินค้าแนะนำ'},
                        });
                      }}
                    >
                      <img
                        src={getBannerForSlot(groupIndex + 1)?.image}
                        alt='Recommended banner'
                        style={{
                          width: '100%',
                          display: 'block',
                        }}
                      />
                    </button>
                  </div>
                )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderCategories = (): JSX.Element | null => {
    if (!categoriesData.length) return null;

    return (
      <div style={{marginBottom: 34, display: 'flex', flexDirection: 'column'}}>
        <div
          style={{
            display: 'flex',
            gap: 10,
            overflowX: 'auto',
            padding: '0 20px 4px',
            scrollSnapType: categoriesData.length > 5 ? 'x proximity' : undefined,
          }}
        >
          {categoriesData.map((item: any) => {
            const categoryProducts = productsData.filter((product: any) => {
              const categoryCode = (product.categoryCode || '').toLowerCase();
              const categoryName = (product.categoryName || '').toLowerCase();
              return (
                categoryCode === String(item.code || '').toLowerCase() ||
                categoryName === String(item.name || '').toLowerCase()
              );
            });
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (!categoryProducts.length) {
                    return navigate('/Categories');
                  }
                  dispatch(actions.resetFilters());
                  navigate('/Shop', {
                    state: {title: item.name, products: categoryProducts},
                  });
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: '0 0 calc((100% - 40px) / 5)',
                  minWidth: 'calc((100% - 40px) / 5)',
                  scrollSnapAlign: 'start',
                  backgroundColor: 'transparent',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '1 / 1',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    backgroundColor: theme.colors.ghostWhite,
                    border: '1px solid #E8EFF4',
                    marginBottom: 10,
                  }}
                >
                  <img
                    src={item.image || item.imageUrl}
                    alt={item.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                </div>
                <span
                  style={{
                    width: '100%',
                    minHeight: 34,
                    color: theme.colors.textColor,
                    textAlign: 'center',
                    ...theme.fonts.Mulish_600SemiBold,
                    fontSize: 12,
                    lineHeight: 1.35,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderBanner = (): JSX.Element => {
    const banner = getBannerForSlot(0);

    const matches = Array.isArray(productsData) ? productsData.slice(0, 8) : [];
    if (!banner?.image) return <></>;

    return (
      <div style={{marginBottom: 40, display: 'flex'}}>
        <button
          onClick={() => {
            dispatch(actions.resetFilters());
            navigate('/Shop', {
              state: {products: matches, title: 'แพ็กเกจแนะนำ'},
            });
          }}
        >
          <img
            src={banner.image}
            alt='Banner'
            style={{
              width: '100%',
              display: 'block',
            }}
          />
        </button>
      </div>
    );
  };

  const renderCategoryBanner = (): JSX.Element => {
    const banner = getBannerForSlot(1);

    if (!banner?.image) return <></>;

    return (
      <div style={{padding: '0 20px', marginBottom: 28, display: 'flex'}}>
        <button
          onClick={() => {
            dispatch(actions.resetFilters());
            navigate('/Shop', {
              state: {products: productsData, title: 'แพ็กเกจทั้งหมด'},
            });
          }}
        >
          <img
            src={banner.image}
            alt='Category banner'
            style={{
              width: '100%',
              display: 'block',
            }}
          />
        </button>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) return <components.TabLoader />;

    if (!productsData.length) {
      return (
        <main
          style={{
            padding: '30px 20px 64px 20px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              backgroundColor: theme.colors.ghostWhite,
              borderRadius: 16,
              padding: 20,
              color: theme.colors.textColor,
              lineHeight: 1.7,
            }}
          >
            ยังไม่มีแพ็กเกจพร้อมขายในขณะนี้ กรุณากลับมาตรวจสอบอีกครั้งภายหลัง
          </div>
        </main>
      );
    }

    return (
        <main
          style={{
            paddingTop: 64,
            paddingBottom: 64,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
        {renderCarousel()}
        {renderCategories()}
        {renderCategoryBanner()}
        {renderBestSellers()}
        {renderBanner()}
      </main>
    );
  };

  const renderBottomTabBar = () => {
    return <components.BottomTabBar />;
  };

  return (
    <>
      {renderHeader()}
      {renderContent()}
      {renderBottomTabBar()}
    </>
  );
};
