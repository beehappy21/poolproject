import axios from 'axios';
import {useLocation} from 'react-router-dom';
import {useNavigate} from 'react-router-dom';
import React, {useEffect, useState} from 'react';
import {Carousel} from 'react-responsive-carousel';

import {items} from '../items';
import {URLS} from '../config';
import {hooks} from '../hooks';
import {svg} from '../assets/svg';
import {theme} from '../constants';
import {product} from '../product';
import {actions} from '../store/actions';
import {components} from '../components';

const getYoutubeVideoId = (url?: string): string | null => {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const videoId = parsed.pathname.replace(/\//g, '');
      return videoId || null;
    }

    if (host.includes('youtube.com')) {
      const videoId =
        parsed.searchParams.get('v') ||
        parsed.pathname.split('/').filter(Boolean).pop();

      return videoId || null;
    }
  } catch (error) {
    return null;
  }

  return null;
};

export const Product: React.FC = () => {
  const location = useLocation();
  const item = location.state.item;

  const dispatch = hooks.useAppDispatch();

  const navigate = useNavigate();

  const [reviewsData, setReviewsData] = useState<any>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  const [selectedSize, setSelectedSize] = useState<string>(
    item.sizes?.[0] || 'standard',
  );
  const [selectedColor, setSelectedColor] = useState<string>(
    item.colors?.[0]?.name || 'default',
  );

  const modifiedItem = {
    ...item,
    color: selectedColor,
    size: selectedSize,
  };

  const galleryImages = Array.isArray(item.images)
    ? item.images.filter(
        (value: unknown, imageIndex: number, array: unknown[]) =>
          typeof value === 'string' &&
          value.trim() !== '' &&
          array.indexOf(value) === imageIndex,
      )
    : [];
  const productImages = galleryImages.slice(0, 10);
  const youtubeVideoId = getYoutubeVideoId(item.youtubeUrl);
  const youtubeThumbnailUrl = youtubeVideoId
    ? `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`
    : null;
  const embedVideoUrl = youtubeVideoId
    ? `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&rel=0&playsinline=1`
    : null;
  const mediaItems = [
    ...(youtubeThumbnailUrl
      ? [{type: 'video' as const, value: youtubeThumbnailUrl}]
      : []),
    ...productImages.map((image: string) => ({type: 'image' as const, value: image})),
  ];

  const usesPackageCatalog = Boolean(item.packageId);
  const hidePackagePresentation = true;
  const hasRealSizes =
    Array.isArray(item.sizes) &&
    item.sizes.length > 0 &&
    !(item.sizes.length === 1 && item.sizes[0] === 'standard');
  const hasRealColors =
    Array.isArray(item.colors) &&
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

  const renderHeader = (): JSX.Element => {
    return <components.Header goBack={true} line={true} basket={true} />;
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
          swipeable={true}
          emulateTouch={true}
        >
          {mediaItems.map((mediaItem: any, index: number) => {
            if (mediaItem.type === 'video') {
              return (
                <button
                  key={`video-${index}`}
                  onClick={() => {
                    if (embedVideoUrl) {
                      setIsVideoOpen(true);
                    }
                  }}
                  style={{
                    width: '100%',
                    aspectRatio: '16 / 9',
                    backgroundColor: theme.colors.imageBackground,
                    border: 'none',
                    padding: 0,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={mediaItem.value}
                    alt='Product video thumbnail'
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'block',
                      objectFit: 'cover',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'linear-gradient(180deg, rgba(15,23,42,0.08) 0%, rgba(15,23,42,0.22) 100%)',
                    }}
                  >
                    <div
                      style={{
                        width: 86,
                        height: 60,
                        borderRadius: 18,
                        backgroundColor: '#FF0000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 12px 24px rgba(0, 0, 0, 0.18)',
                      }}
                    >
                      <div
                        style={{
                          width: 0,
                          height: 0,
                          borderTop: '12px solid transparent',
                          borderBottom: '12px solid transparent',
                          borderLeft: '18px solid #FFFFFF',
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
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={mediaItem.value}
                  alt='Carousel'
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              </div>
            );
          })}
        </Carousel>
      </div>
    );
  };

  const renderNameWithButton = (): JSX.Element => {
    return (
      <div
        style={{
          display: 'flex',
          padding: '0 20px 0 20px',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h3
          style={{
            ...theme.fonts.Mulish_700Bold,
            fontSize: 20,
            color: theme.colors.mainColor,
          }}
        >
          {item.name}
        </h3>
        <product.ProductInWishlist item={item} version={2} />
      </div>
    );
  };

  const renderRating = (): JSX.Element => {
    if (!hidePackagePresentation && usesPackageCatalog && (!item.ratingCount || Number(item.ratingCount) === 0)) {
      return (
        <div style={{padding: '0 20px 0 20px', marginBottom: 12}}>
          <span
            style={{
              ...theme.fonts.Mulish_400Regular,
              fontSize: 14,
              lineHeight: 1.5,
              color: theme.colors.textColor,
            }}
          >
            Package ready to order
          </span>
        </div>
      );
    }

    return (
      <div style={{padding: '0 20px 0 20px', marginBottom: 5}}>
        <product.ProductRating
          rating={item.rating}
          ratingCount={item.ratingCount}
        />
      </div>
    );
  };

  const renderPriceWithQuantity = (): JSX.Element => {
    return (
      <div
        style={{
          display: 'flex',
          marginBottom: 20,
          padding: '0 20px 0 20px',
          ...theme.flex.rowCenterSpaceBetween,
        }}
      >
        <div
          style={{
            ...theme.fonts.Mulish_600SemiBold,
            fontSize: 20,
            lineHeight: 1.5,
            color: theme.colors.mainColor,
          }}
        >
          ${item.price}
        </div>
        <product.ProductCounterInner item={modifiedItem} />
      </div>
    );
  };

  const renderPackageMeta = (): JSX.Element | null => {
    if (!usesPackageCatalog || hidePackagePresentation) {
      return null;
    }

    return (
      <div style={{marginBottom: 28, padding: '0 20px'}}>
        <div
          style={{
            display: 'grid',
            gap: 10,
            backgroundColor: theme.colors.ghostWhite,
            borderRadius: 16,
            padding: 18,
          }}
        >
          <span
            style={{
              ...theme.fonts.Mulish_600SemiBold,
              fontSize: 14,
              color: theme.colors.mainColor,
              lineHeight: 1.5,
            }}
          >
            รหัสแพ็กเกจ: {item.packageCode || '-'}
          </span>
          <span
            style={{
              ...theme.fonts.Mulish_400Regular,
              fontSize: 14,
              color: theme.colors.textColor,
              lineHeight: 1.5,
            }}
          >
            PV: {item.pv || 0}
          </span>
          <span
            style={{
              ...theme.fonts.Mulish_400Regular,
              fontSize: 14,
              color: theme.colors.textColor,
              lineHeight: 1.5,
            }}
          >
            จำนวนวันใช้งาน: {item.activeDays || 0}
          </span>
          <span
            style={{
              ...theme.fonts.Mulish_400Regular,
              fontSize: 14,
              color: theme.colors.textColor,
              lineHeight: 1.5,
            }}
          >
            จำนวนรายการในแพ็กเกจ: {item.itemCount || 0}
          </span>
          <span
            style={{
              ...theme.fonts.Mulish_400Regular,
              fontSize: 14,
              color: theme.colors.textColor,
              lineHeight: 1.5,
            }}
          >
            สถานะ: {String(item.status || 'active').toUpperCase()}
          </span>
          {item.categoryName ? (
            <span
              style={{
                ...theme.fonts.Mulish_400Regular,
                fontSize: 14,
                color: theme.colors.textColor,
                lineHeight: 1.5,
              }}
            >
              หมวดหมู่: {item.categoryName}
            </span>
          ) : null}
          {item.supplierName ? (
            <span
              style={{
                ...theme.fonts.Mulish_400Regular,
                fontSize: 14,
                color: theme.colors.textColor,
                lineHeight: 1.5,
              }}
            >
              ซัพพลายเออร์: {item.supplierName}
            </span>
          ) : null}
        </div>
      </div>
    );
  };

  const renderIncludedItems = (): JSX.Element | null => {
    if (
      !usesPackageCatalog ||
      hidePackagePresentation ||
      !Array.isArray(item.packageItems) ||
      !item.packageItems.length
    ) {
      return null;
    }

    return (
      <div style={{marginBottom: 28, padding: '0 20px'}}>
        <h5
          style={{
            marginTop: 0,
            marginBottom: 14,
            ...theme.fonts.Mulish_600SemiBold,
            fontSize: 16,
            fontWeight: 600,
            color: theme.colors.mainColor,
          }}
        >
          รายการในแพ็กเกจ
        </h5>
        <div
          style={{
            display: 'grid',
            gap: 10,
            backgroundColor: theme.colors.white,
            borderRadius: 16,
            padding: 18,
            border: `1px solid ${theme.colors.aliceBlue2}`,
          }}
        >
          {item.packageItems.map((packageItem: any) => (
            <div
              key={packageItem.packageItemId}
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
                    ...theme.fonts.Mulish_600SemiBold,
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: theme.colors.mainColor,
                  }}
                >
                  {packageItem.productDetailName}
                </div>
                {packageItem.shortDescription ? (
                  <div
                    style={{
                      ...theme.fonts.Mulish_400Regular,
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: theme.colors.textColor,
                    }}
                  >
                    {packageItem.shortDescription}
                  </div>
                ) : null}
              </div>
              <div
                style={{
                  ...theme.fonts.Mulish_700Bold,
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: theme.colors.mainColor,
                  whiteSpace: 'nowrap',
                }}
              >
                x{packageItem.qty}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSizes = (): JSX.Element => {
    if (!hasRealSizes) {
      return <></>;
    }

    return (
      <div style={{marginBottom: 40, padding: '0 20px 0 20px'}}>
        <h5
          style={{
            marginBottom: 14,
            ...theme.fonts.Mulish_600SemiBold,
            fontSize: 16,
            fontWeight: 600,
            color: theme.colors.mainColor,
          }}
        >
          Size
        </h5>
        <div
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            display: 'flex',
            flexWrap: 'wrap',
          }}
        >
          {item.sizes?.map((item: string, index: number) => {
            return (
              <button
                key={index}
                style={{
                  width: 50,
                  height: 50,
                  backgroundColor:
                    selectedSize === item
                      ? theme.colors.mainColor
                      : theme.colors.imageBackground,
                  borderRadius: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onClick={() => {
                  setSelectedSize(item);
                }}
              >
                <div
                  style={{
                    color:
                      selectedSize === item
                        ? theme.colors.mainYellow
                        : theme.colors.mainColor,
                    ...theme.fonts.Mulish_700Bold,
                    fontSize: 12,
                  }}
                >
                  {item}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderColors = (): JSX.Element => {
    if (!hasRealColors) {
      return <></>;
    }

    return (
      <div
        style={{
          marginBottom: 40,
          padding: '0 20px 0 20px',
        }}
      >
        <h5
          style={{
            marginBottom: 14,
            ...theme.fonts.Mulish_600SemiBold,
            fontSize: 16,
            fontWeight: 600,
            color: theme.colors.mainColor,
          }}
        >
          Color
        </h5>
        <div
          style={{
            gap: 14,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {item.colors?.map((item: any, index: number) => {
            return (
              <button
                key={index}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: item.code,
                  justifyContent: 'center',
                }}
                onClick={() => {
                  setSelectedColor(item.name);
                }}
              >
                {selectedColor === item.name && <svg.CheckSvg />}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDescription = (): JSX.Element => {
    return (
      <div style={{marginBottom: 40, padding: '0 20px 0 20px'}}>
        <h5
          style={{
            marginBottom: 14,
            ...theme.fonts.Mulish_600SemiBold,
            fontSize: 16,
            fontWeight: 600,
            color: theme.colors.mainColor,
          }}
        >
          {'รายละเอียด'}
        </h5>
        <p
          style={{
            margin: 0,
            marginBottom: 20,
            color: theme.colors.textColor,
            lineHeight: 1.7,
          }}
        >
          {item.description}
        </p>
        {!usesPackageCatalog ? (
          <button
            onClick={() => {
              navigate('/description', {state: {item}});
            }}
          >
            <svg.ReadMoreSvg />
          </button>
        ) : null}
      </div>
    );
  };

  const renderButtons = (): JSX.Element => {
    return (
      <>
        <components.Button
          title='เพิ่มลงตะกร้า'
          onClick={() => {
            dispatch(actions.addToCart(modifiedItem));
          }}
          containerStyle={{marginBottom: 10, padding: '0 20px 0 20px'}}
        />
        {!usesPackageCatalog ? (
          <components.Button
            title='Leave a review'
            colorScheme='light'
            onClick={() => {
              navigate('/LeaveAReview');
            }}
            containerStyle={{marginBottom: 40, padding: '0 20px 0 20px'}}
          />
        ) : (
          <div style={{marginBottom: 40}} />
        )}
      </>
    );
  };

  const renderReviews = (): JSX.Element => {
    if (usesPackageCatalog) {
      return <></>;
    }

    const reviewQty = 3;
    return (
      <div>
        <components.BlockHeading
          title={`Reviews (${reviewsData.slice(0, reviewQty).length})`}
          containerStyle={{
            padding: '0 20px 0 20px',
            marginBottom: 20,
          }}
          viewAllOnClick={() => {
            navigate('/reviews', {state: {reviews: reviewsData}});
          }}
        />
        {reviewsData
          .slice(0, reviewQty)
          .map((item: any, index: number, array: any) => {
            const isLast = index === array.length - 1;
            return (
              <items.ReviewItem
                item={item}
                isLast={isLast}
                key={item.id.toString()}
              />
            );
          })}
      </div>
    );
  };

  const renderContent = (): JSX.Element => {
    if (isLoading) return <components.Loader />;

    return (
      <div style={{padding: '0 0 20px 0'}}>
        {renderCarousel()}
        {renderNameWithButton()}
        {renderRating()}
        {renderPriceWithQuantity()}
        {renderPackageMeta()}
        {renderIncludedItems()}
        {renderSizes()}
        {renderColors()}
        {renderDescription()}
        {renderButtons()}
        {renderReviews()}
      </div>
    );
  };

  return (
    <>
      {renderHeader()}
      {renderContent()}
      {isVideoOpen && embedVideoUrl ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.82)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 960,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{display: 'flex', justifyContent: 'flex-end'}}>
              <button
                onClick={() => setIsVideoOpen(false)}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: '#FFFFFF',
                  color: theme.colors.mainColor,
                  ...theme.fonts.Mulish_700Bold,
                  fontSize: 20,
                  lineHeight: 1,
                }}
              >
                x
              </button>
            </div>
            <div
              style={{
                width: '100%',
                aspectRatio: '16 / 9',
                backgroundColor: '#000000',
                overflow: 'hidden',
              }}
            >
              <iframe
                src={embedVideoUrl}
                title='Product video modal'
                style={{
                  width: '100%',
                  height: '100%',
                  border: 0,
                  display: 'block',
                }}
                allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
                referrerPolicy='strict-origin-when-cross-origin'
                allowFullScreen
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
