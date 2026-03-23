import axios from 'axios';
import {useState} from 'react';
import {useEffect, FC} from 'react';
import {Carousel} from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';

import {URLS} from '../../config';
import {hooks} from '../../hooks';
import {items} from '../../items';
import {custom} from '../../custom';
import {theme} from '../../constants';
import {actions} from '../../store/actions';
import {components} from '../../components';
import {fetchLiveProducts} from '../../utils/liveCatalog';

export const Home: FC = () => {
  const dispatch = hooks.useAppDispatch();
  const navigate = hooks.useAppNavigate();

  const [loading, setLoading] = useState<boolean>(true);

  const [activeIndex, setActiveIndex] = useState(0);

  const [productsData, setProductsData] = useState<any>([]);
  const [bannersData, setBannersData] = useState<any>([]);
  const [carouselData, setCarouselData] = useState<any>([]);

  const getData = async () => {
    setLoading(true);

    try {
      const products = await fetchLiveProducts();

      const banners = await axios
        .get(URLS.GET_BANNERS)
        .then(res => res.data.banners);

      const carousel = await axios
        .get(URLS.GET_CAROUSEL)
        .then(res => res.data.carousel);

      setProductsData(products);
      setBannersData(banners);
      setCarouselData(carousel);
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

  const handleSlideChange = (index: number) => {
    setActiveIndex(index);
  };

  const renderHeader = (): JSX.Element => {
    return <components.Header burger={true} basket={true} line={true} />;
  };

  const renderCarousel = (): JSX.Element => {
    return (
      <div style={{marginBottom: 22}}>
        <Carousel
          infiniteLoop={false}
          showStatus={false}
          showThumbs={false}
          thumbWidth={22}
          showIndicators={false}
          showArrows={false}
          onChange={handleSlideChange}
          swipeable={true}
          emulateTouch={true}
        >
          {carouselData?.map((item: any, index: any) => {
            return (
              <img
                key={index}
                src={item.image}
                alt='Carousel'
                style={{
                  width: '100%',
                  height: 300,
                  objectFit: 'contain',
                  backgroundColor: theme.colors.imageBackground,
                }}
              />
            );
          })}
        </Carousel>
      </div>
    );
  };

  const renderIndicator = (): JSX.Element => {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 40,
        }}
      >
        {carouselData?.map((item: any, index: number) => {
          const isSelected = index === activeIndex;
          const indicatorStyle = {
            background: isSelected ? theme.colors.mainColor : '#E8EFF4',
            display: 'inline-block',
            width: 22,
            height: 6,
            margin: '0 6px',
            borderRadius: 6,
          };
          return <div style={indicatorStyle} key={index} />;
        })}
      </div>
    );
  };

  const renderBestSellers = (): JSX.Element => {
    const popularPackages = productsData.filter(
      (item: any) => item.isTop || item.isFeatured,
    );
    const displayPackages = popularPackages.length ? popularPackages : productsData;

    return (
      <div style={{marginBottom: 40, display: 'flex', flexDirection: 'column'}}>
        <components.BlockHeading
          title='แพ็กเกจแนะนำ'
          containerStyle={{
            padding: '0 20px 0',
            marginBottom: 14,
          }}
          viewAllOnClick={() => {
            dispatch(actions.resetFilters());
            navigate('/Shop', {
              state: {products: displayPackages, title: 'แพ็กเกจแนะนำ'},
            });
          }}
        />
        <custom.ScrollView style={{paddingLeft: 20, paddingRight: 20}}>
          {displayPackages?.map((item: any, index: number, arra: any) => {
            const isLast = index === arra.length - 1;
            return (
              <items.ProductCard
                key={item.id}
                isLast={isLast}
                item={item}
                version={1}
              />
            );
          })}
        </custom.ScrollView>
      </div>
    );
  };

  const renderBanner = (): JSX.Element => {
    const banner =
      bannersData && bannersData?.length > 0 ? bannersData[0]?.image : '';

    const matches = Array.isArray(productsData) ? productsData.slice(0, 8) : [];
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
            src={banner}
            alt='Banner'
            style={{
              width: '100%',
            }}
          />
        </button>
      </div>
    );
  };

  const renderFeatured = (): JSX.Element => {
    const featuredPackages = productsData.filter((item: any) => item.isFeatured);
    const displayPackages = featuredPackages.length ? featuredPackages : productsData;

    return (
      <div style={{marginBottom: 40, display: 'flex', flexDirection: 'column'}}>
        <components.BlockHeading
          title='แพ็กเกจเด่น'
          containerStyle={{
            paddingLeft: 20,
            paddingRight: 20,
            marginBottom: 14,
          }}
          viewAllOnClick={() => {
            dispatch(actions.resetFilters());
            navigate('/Shop', {
              state: {products: displayPackages, title: 'แพ็กเกจเด่น'},
            });
          }}
        />
        <custom.ScrollView style={{paddingLeft: 20, paddingRight: 20}}>
          {displayPackages?.map((item: any, index: number, arra: any) => {
            const isLast = index === arra.length - 1;
            return (
              <items.ProductCard
                key={item.id}
                isLast={isLast}
                item={item}
                version={3}
              />
            );
          })}
        </custom.ScrollView>
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
          paddingBottom: 64,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {renderCarousel()}
        {renderIndicator()}
        {renderBestSellers()}
        {renderBanner()}
        {renderFeatured()}
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
