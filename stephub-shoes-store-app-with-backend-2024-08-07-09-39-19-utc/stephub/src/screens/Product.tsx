import axios from 'axios';
import React, {useEffect, useRef, useState} from 'react';
import {Carousel} from 'react-responsive-carousel';
import {useLocation, useNavigate} from 'react-router-dom';

import {items} from '../items';
import {URLS} from '../config';
import {hooks} from '../hooks';
import {svg} from '../assets/svg';
import {theme} from '../constants';
import {formatTHB} from '../utils/currency';
import {product} from '../product';
import {actions} from '../store/actions';
import {components} from '../components';

type MediaItem =
  | {
      type: 'video';
      embedUrl: string;
    }
  | {
      type: 'image';
      url: string;
    };

const getYoutubeVideoId = (url?: string): string | null => {
  if (!url) {
    return null;
  }

  const watchMatch = url.match(/[?&]v=([^&#]+)/);
  if (watchMatch?.[1]) {
    return watchMatch[1];
  }

  const shortMatch = url.match(/youtu\.be\/([^?&#/]+)/);
  if (shortMatch?.[1]) {
    return shortMatch[1];
  }

  const embedMatch = url.match(/embed\/([^?&#/]+)/);
  if (embedMatch?.[1]) {
    return embedMatch[1];
  }

  return null;
};

const buildMediaItems = (item: any): MediaItem[] => {
  const media: MediaItem[] = [];
  const videoId = getYoutubeVideoId(item.youtubeUrl);

  if (videoId) {
    media.push({
      type: 'video',
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&rel=0&playsinline=1&enablejsapi=1`,
    });
  }

  const imageList = Array.isArray(item.images) ? item.images : [];
  const uniqueImages = imageList.filter(
    (value: string, index: number, array: string[]) =>
      Boolean(value) && array.indexOf(value) === index,
  );

  uniqueImages.forEach((url: string) => {
    media.push({type: 'image', url});
  });

  if (!media.length && item.image) {
    media.push({type: 'image', url: item.image});
  }

  return media;
};

export const Product: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = hooks.useAppDispatch();

  const item = location.state?.item;

  const [reviewsData, setReviewsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedSize, setSelectedSize] = useState<string>(
    item?.sizes?.[0] || 'standard',
  );
  const [selectedColor, setSelectedColor] = useState<string>(
    item?.colors?.[0]?.name || 'default',
  );
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const videoFrameRef = useRef<HTMLIFrameElement | null>(null);

  const modifiedItem = {
    ...item,
    color: selectedColor,
    size: selectedSize,
  };

  const mediaItems = buildMediaItems(item || {});
  const hasLeadingVideo = mediaItems[0]?.type === 'video';
  const hasRealSizes =
    Array.isArray(item?.sizes) &&
    item.sizes.length > 0 &&
    !(item.sizes.length === 1 && item.sizes[0] === 'standard');
  const hasRealColors =
    Array.isArray(item?.colors) &&
    item.colors.length > 0 &&
    !(item.colors.length === 1 && item.colors[0]?.name === 'default');

  const getReviews = async () => {
    const targetProductDetailId = item?.productDetailId || item?.id;

    if (!targetProductDetailId) {
      setReviewsData([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.get<{items?: any[]}>(
        URLS.buildProductReviewsUrl(String(targetProductDetailId)),
      );
      const reviews = response.data?.items || [];

      setReviewsData(reviews);
    } catch (error) {
      console.error(error);
      setReviewsData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    getReviews();
  }, []);

  useEffect(() => {
    if (!hasLeadingVideo || !videoFrameRef.current) {
      return;
    }

    const iframe = videoFrameRef.current;

    const sendYoutubeCommand = (func: string, args: unknown[] = []) => {
      iframe.contentWindow?.postMessage(
        JSON.stringify({
          event: 'command',
          func,
          args,
        }),
        '*',
      );
    };

    if (activeMediaIndex !== 0) {
      sendYoutubeCommand('pauseVideo');
      return;
    }

    const timer = window.setTimeout(() => {
      sendYoutubeCommand('setVolume', [50]);
      sendYoutubeCommand('playVideo');
    }, 1200);

    return () => {
      window.clearTimeout(timer);
      sendYoutubeCommand('pauseVideo');
    };
  }, [activeMediaIndex, hasLeadingVideo, mediaItems]);

  if (!item) {
    return (
      <div style={{minHeight: '100vh', backgroundColor: theme.colors.white}}>
        <components.Header goBack={true} line={true} basket={true} />
        <main style={{padding: '120px 20px 96px'}}>
          <div
            style={{
              padding: 24,
              backgroundColor: theme.colors.ghostWhite,
              color: theme.colors.textColor,
              lineHeight: 1.7,
            }}
          >
            ไม่พบข้อมูลสินค้า
          </div>
        </main>
      </div>
    );
  }

  const renderHeader = (): JSX.Element => {
    return <components.Header goBack={true} line={true} basket={true} />;
  };

  const renderMediaSlide = (media: MediaItem, index: number): JSX.Element => {
    if (media.type === 'video') {
      return (
        <div
          key={`video-${index}`}
          style={{
            width: '100%',
            aspectRatio: '16 / 9',
            backgroundColor: '#000',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'stretch',
          }}
        >
          <iframe
            ref={videoFrameRef}
            src={media.embedUrl}
            title={`${item.name} video`}
            allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
            allowFullScreen={true}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
              flex: 1,
            }}
          />
        </div>
      );
    }

    return (
      <div
        key={`image-${index}`}
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          backgroundColor: '#000',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'stretch',
        }}
      >
        <img
          src={media.url}
          alt={item.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            backgroundColor: '#000',
            flex: 1,
          }}
        />
      </div>
    );
  };

  const renderMediaGallery = (): JSX.Element => {
    return (
      <section style={{marginBottom: 28}}>
        <div
          style={{
            width: '100%',
            aspectRatio: '16 / 9',
            backgroundColor: '#000',
            overflow: 'hidden',
          }}
        >
          <Carousel
            infiniteLoop={false}
            showStatus={false}
            showThumbs={false}
            showIndicators={false}
            showArrows={false}
            swipeable={true}
            emulateTouch={true}
            selectedItem={activeMediaIndex}
            onChange={index => setActiveMediaIndex(index)}
          >
            {mediaItems.map((media, index) => renderMediaSlide(media, index))}
          </Carousel>
        </div>
      </section>
    );
  };

  const renderHero = (): JSX.Element => {
    return (
      <section
        style={{
          display: 'grid',
          gap: 18,
          marginBottom: 28,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
          }}
        >
          <div style={{minWidth: 0, flex: 1}}>
            {item.categoryName ? (
              <div
                style={{
                  marginBottom: 8,
                  display: 'inline-flex',
                  padding: '6px 12px',
                  backgroundColor: theme.colors.ghostWhite,
                  color: theme.colors.mainColor,
                  ...theme.fonts.Mulish_600SemiBold,
                  fontSize: 12,
                  letterSpacing: 0.4,
                }}
              >
                {item.categoryName}
              </div>
            ) : null}

            <h1
              style={{
                marginTop: 0,
                marginBottom: 10,
                color: theme.colors.mainColor,
                ...theme.fonts.Mulish_700Bold,
                fontSize: 34,
                lineHeight: 1.12,
              }}
            >
              {item.name}
            </h1>

            <div style={{marginBottom: 12}}>
              <product.ProductRating
                rating={item.rating}
                ratingCount={item.ratingCount}
              />
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
                marginBottom: 14,
              }}
            >
              {item.productCode ? (
                <div
                  style={{
                    padding: '8px 12px',
                    backgroundColor: theme.colors.imageBackground,
                    color: theme.colors.textColor,
                    ...theme.fonts.Mulish_600SemiBold,
                    fontSize: 12,
                  }}
                >
                  รหัสสินค้า: {item.productCode}
                </div>
              ) : null}

              {typeof item.pv !== 'undefined' ? (
                <div
                  style={{
                    padding: '8px 12px',
                    backgroundColor: theme.colors.imageBackground,
                    color: theme.colors.textColor,
                    ...theme.fonts.Mulish_600SemiBold,
                    fontSize: 12,
                  }}
                >
                  PV {item.pv}
                </div>
              ) : null}

              {item.supplierName ? (
                <div
                  style={{
                    padding: '8px 12px',
                    backgroundColor: theme.colors.imageBackground,
                    color: theme.colors.textColor,
                    ...theme.fonts.Mulish_600SemiBold,
                    fontSize: 12,
                  }}
                >
                  {item.supplierName}
                </div>
              ) : null}
            </div>

            <p
              style={{
                marginTop: 0,
                marginBottom: 0,
                color: theme.colors.textColor,
                lineHeight: 1.75,
                fontSize: 15,
                ...theme.fonts.Mulish_400Regular,
                maxWidth: 760,
              }}
            >
              {item.shortDescription || item.description}
            </p>
          </div>

          <div style={{flexShrink: 0}}>
            <product.ProductInWishlist item={item} version={2} />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 18,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              color: theme.colors.mainColor,
              ...theme.fonts.Mulish_700Bold,
              fontSize: 34,
              lineHeight: 1,
            }}
          >
            {formatTHB(item.price)}
          </div>
          <product.ProductCounterInner item={modifiedItem} />
        </div>
      </section>
    );
  };

  const renderOverview = (): JSX.Element => {
    return (
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
          marginBottom: 28,
        }}
      >
        <div
          style={{
            padding: 18,
            backgroundColor: theme.colors.ghostWhite,
          }}
        >
          <div
            style={{
              marginBottom: 6,
              color: theme.colors.textColor,
              fontSize: 12,
              ...theme.fonts.Mulish_600SemiBold,
            }}
          >
            สถานะ
          </div>
          <div
            style={{
              color: theme.colors.mainColor,
              fontSize: 16,
              ...theme.fonts.Mulish_700Bold,
            }}
          >
            {String(item.status || 'active').toUpperCase()}
          </div>
        </div>

        {item.categoryName ? (
          <div
            style={{
              padding: 18,
              backgroundColor: theme.colors.ghostWhite,
            }}
          >
            <div
              style={{
                marginBottom: 6,
                color: theme.colors.textColor,
                fontSize: 12,
                ...theme.fonts.Mulish_600SemiBold,
              }}
            >
              หมวดหมู่
            </div>
            <div
              style={{
                color: theme.colors.mainColor,
                fontSize: 16,
                ...theme.fonts.Mulish_700Bold,
              }}
            >
              {item.categoryName}
            </div>
          </div>
        ) : null}

        {item.activeDays ? (
          <div
            style={{
              padding: 18,
              backgroundColor: theme.colors.ghostWhite,
            }}
          >
            <div
              style={{
                marginBottom: 6,
                color: theme.colors.textColor,
                fontSize: 12,
                ...theme.fonts.Mulish_600SemiBold,
              }}
            >
              ระยะเวลาใช้งาน
            </div>
            <div
              style={{
                color: theme.colors.mainColor,
                fontSize: 16,
                ...theme.fonts.Mulish_700Bold,
              }}
            >
              {item.activeDays} วัน
            </div>
          </div>
        ) : null}
      </section>
    );
  };

  const renderSizes = (): JSX.Element | null => {
    if (!hasRealSizes) {
      return null;
    }

    return (
      <section style={{marginBottom: 28}}>
        <h3
          style={{
            marginTop: 0,
            marginBottom: 14,
            color: theme.colors.mainColor,
            ...theme.fonts.Mulish_600SemiBold,
            fontSize: 18,
          }}
        >
          ขนาด
        </h3>
        <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
          {item.sizes.map((size: string) => (
            <button
              key={size}
              onClick={() => setSelectedSize(size)}
              style={{
                minWidth: 54,
                height: 46,
                paddingLeft: 16,
                paddingRight: 16,
                border: 'none',
                backgroundColor:
                  selectedSize === size
                    ? theme.colors.mainColor
                    : theme.colors.imageBackground,
                color:
                  selectedSize === size
                    ? theme.colors.mainYellow
                    : theme.colors.mainColor,
                ...theme.fonts.Mulish_700Bold,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {size}
            </button>
          ))}
        </div>
      </section>
    );
  };

  const renderColors = (): JSX.Element | null => {
    if (!hasRealColors) {
      return null;
    }

    return (
      <section style={{marginBottom: 28}}>
        <h3
          style={{
            marginTop: 0,
            marginBottom: 14,
            color: theme.colors.mainColor,
            ...theme.fonts.Mulish_600SemiBold,
            fontSize: 18,
          }}
        >
          สี
        </h3>
        <div style={{display: 'flex', gap: 12, flexWrap: 'wrap'}}>
          {item.colors.map((colorItem: any, index: number) => (
            <button
              key={`${colorItem.name}-${index}`}
              onClick={() => setSelectedColor(colorItem.name)}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                border:
                  selectedColor === colorItem.name
                    ? `2px solid ${theme.colors.mainColor}`
                    : '2px solid transparent',
                backgroundColor: colorItem.code,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {selectedColor === colorItem.name ? <svg.CheckSvg /> : null}
            </button>
          ))}
        </div>
      </section>
    );
  };

  const renderDescription = (): JSX.Element => {
    return (
      <section style={{marginBottom: 28}}>
        <h3
          style={{
            marginTop: 0,
            marginBottom: 14,
            color: theme.colors.mainColor,
            ...theme.fonts.Mulish_600SemiBold,
            fontSize: 18,
          }}
        >
          รายละเอียดสินค้า
        </h3>
        <div
          style={{
            padding: 22,
            backgroundColor: theme.colors.ghostWhite,
            color: theme.colors.textColor,
            lineHeight: 1.8,
            fontSize: 15,
            ...theme.fonts.Mulish_400Regular,
          }}
        >
          {item.description}
        </div>
      </section>
    );
  };

  const renderProductItems = (): JSX.Element | null => {
    return null;
  };

  const renderActions = (): JSX.Element => {
    return (
      <section style={{marginBottom: 34}}>
        <components.Button
          title='เพิ่มลงตะกร้า'
          onClick={() => dispatch(actions.addToCart(modifiedItem))}
          containerStyle={{marginBottom: 10}}
        />
        <components.Button
          title='เขียนรีวิว'
          colorScheme='light'
          onClick={() =>
            navigate('/LeaveAReview', {
              state: {
                product: item,
                productDetailId: String(item.productDetailId || item.id || ''),
                productName: item.name,
              },
            })
          }
        />
      </section>
    );
  };

  const renderReviews = (): JSX.Element | null => {
    const reviewQty = 3;

    if (!reviewsData.length) {
      return null;
    }

    return (
      <section>
        <components.BlockHeading
          title={`รีวิว (${reviewsData.slice(0, reviewQty).length})`}
          containerStyle={{marginBottom: 20}}
          viewAllOnClick={() => {
            navigate('/reviews', {state: {reviews: reviewsData}});
          }}
        />
        <div
          style={{
            backgroundColor: theme.colors.white,
            border: `1px solid ${theme.colors.aliceBlue2}`,
          }}
        >
          {reviewsData
            .slice(0, reviewQty)
            .map((review: any, index: number, array: any[]) => {
              const isLast = index === array.length - 1;
              return (
                <items.ReviewItem
                  item={review}
                  isLast={isLast}
                  key={review.id.toString()}
                />
              );
            })}
        </div>
      </section>
    );
  };

  const renderContent = (): JSX.Element => {
    if (isLoading) {
      return <components.Loader />;
    }

    return (
      <main
        style={{
          paddingBottom: 96,
          backgroundColor: theme.colors.white,
        }}
      >
        {renderMediaGallery()}
        <div
          style={{
            width: 'min(1120px, 100%)',
            margin: '0 auto',
            paddingLeft: 20,
            paddingRight: 20,
          }}
        >
          {renderHero()}
          {renderOverview()}
          {renderSizes()}
          {renderColors()}
          {renderDescription()}
          {renderProductItems()}
          {renderActions()}
          {renderReviews()}
        </div>
      </main>
    );
  };

  return (
    <div style={{minHeight: '100vh', backgroundColor: theme.colors.white}}>
      {renderHeader()}
      {renderContent()}
    </div>
  );
};
