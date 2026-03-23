import axios from 'axios';
import React, {useEffect, useState} from 'react';
import {Carousel} from 'react-responsive-carousel';
import {useLocation, useNavigate} from 'react-router-dom';

import {items} from '../items';
import {URLS} from '../config';
import {hooks} from '../hooks';
import {svg} from '../assets/svg';
import {theme} from '../constants';
import {product} from '../product';
import {actions} from '../store/actions';
import {components} from '../components';

type MediaItem =
  | {
      type: 'video';
      url: string;
      embedUrl: string;
      thumbnailUrl: string;
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
      url: item.youtubeUrl,
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
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
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  const modifiedItem = {
    ...item,
    color: selectedColor,
    size: selectedSize,
  };

  const mediaItems = buildMediaItems(item || {});
  const hasPackageBridge = Boolean(item?.packageId);
  const showProductOnlyPresentation = true;
  const hasRealSizes =
    Array.isArray(item?.sizes) &&
    item.sizes.length > 0 &&
    !(item.sizes.length === 1 && item.sizes[0] === 'standard');
  const hasRealColors =
    Array.isArray(item?.colors) &&
    item.colors.length > 0 &&
    !(item.colors.length === 1 && item.colors[0]?.name === 'default');

  const getReviews = async () => {
    setIsLoading(true);
    try {
      const reviews = await axios
        .get(URLS.GET_REVIEWS)
        .then(res => res.data.reviews);

      setReviewsData(reviews);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    getReviews();
  }, []);

  useEffect(() => {
    if (videoModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [videoModalOpen]);

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

  const renderVideoModal = (): JSX.Element | null => {
    const videoItem = mediaItems.find(
      (media): media is Extract<MediaItem, {type: 'video'}> =>
        media.type === 'video',
    );

    if (!videoModalOpen || !videoItem) {
      return null;
    }

    return (
      <div
        onClick={() => setVideoModalOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(13, 20, 35, 0.78)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <div
          onClick={event => event.stopPropagation()}
          style={{
            width: 'min(960px, 100%)',
            backgroundColor: theme.colors.white,
            padding: 14,
            position: 'relative',
          }}
        >
          <button
            onClick={() => setVideoModalOpen(false)}
            style={{
              position: 'absolute',
              right: 14,
              top: 14,
              width: 40,
              height: 40,
              borderRadius: 20,
              border: 'none',
              backgroundColor: 'rgba(25, 51, 100, 0.08)',
              color: theme.colors.mainColor,
              fontSize: 20,
              cursor: 'pointer',
              zIndex: 2,
            }}
          >
            x
          </button>
          <div
            style={{
              width: '100%',
              aspectRatio: '16 / 9',
              backgroundColor: '#000',
            }}
          >
            <iframe
              src={videoItem.embedUrl}
              title={item.name}
              allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
              allowFullScreen={true}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block',
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderMediaSlide = (media: MediaItem, index: number): JSX.Element => {
    if (media.type === 'video') {
      return (
        <button
          key={`video-${index}`}
          onClick={() => setVideoModalOpen(true)}
          style={{
            width: '100%',
            padding: 0,
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: '100%',
              aspectRatio: '16 / 9',
              backgroundColor: theme.colors.imageBackground,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <img
              src={media.thumbnailUrl}
              alt='Video thumbnail'
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.22) 100%)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 88,
                height: 62,
                borderRadius: 18,
                backgroundColor: '#FF2D2D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 18px 32px rgba(255, 45, 45, 0.28)',
              }}
            >
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderTop: '12px solid transparent',
                  borderBottom: '12px solid transparent',
                  borderLeft: '18px solid white',
                  marginLeft: 4,
                }}
              />
            </div>
          </div>
        </button>
      );
    }

    return (
      <div
        key={`image-${index}`}
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          backgroundColor: theme.colors.imageBackground,
          overflow: 'hidden',
        }}
      >
        <img
          src={media.url}
          alt={item.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            backgroundColor: theme.colors.imageBackground,
          }}
        />
      </div>
    );
  };

  const renderMediaGallery = (): JSX.Element => {
    return (
      <section style={{marginBottom: 28}}>
        <Carousel
          infiniteLoop={false}
          showStatus={false}
          showThumbs={false}
          showIndicators={false}
          showArrows={false}
          swipeable={true}
          emulateTouch={true}
        >
          {mediaItems.map((media, index) => renderMediaSlide(media, index))}
        </Carousel>
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
            ${item.price}
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
    if (
      !hasPackageBridge ||
      showProductOnlyPresentation ||
      !Array.isArray(item.packageItems) ||
      !item.packageItems.length
    ) {
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
          รายการสินค้า
        </h3>
        <div
          style={{
            display: 'grid',
            gap: 12,
            padding: 22,
            backgroundColor: theme.colors.white,
            border: `1px solid ${theme.colors.aliceBlue2}`,
          }}
        >
          {item.packageItems.map((productBridgeItem: any) => (
            <div
              key={productBridgeItem.packageItemId}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                alignItems: 'flex-start',
              }}
            >
              <div>
                <div
                  style={{
                    color: theme.colors.mainColor,
                    ...theme.fonts.Mulish_600SemiBold,
                    fontSize: 15,
                    lineHeight: 1.5,
                    marginBottom: 4,
                  }}
                >
                  {productBridgeItem.productDetailName}
                </div>
                {productBridgeItem.shortDescription ? (
                  <div
                    style={{
                      color: theme.colors.textColor,
                      ...theme.fonts.Mulish_400Regular,
                      fontSize: 13,
                      lineHeight: 1.7,
                    }}
                  >
                    {productBridgeItem.shortDescription}
                  </div>
                ) : null}
              </div>
              <div
                style={{
                  color: theme.colors.mainColor,
                  ...theme.fonts.Mulish_700Bold,
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                }}
              >
                x{productBridgeItem.qty}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
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
          onClick={() => navigate('/LeaveAReview')}
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
      {renderVideoModal()}
    </div>
  );
};
