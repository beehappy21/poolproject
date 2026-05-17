import axios from 'axios';
import React, {useEffect, useRef, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';

import {items} from '../items';
import {URLS} from '../config';
import {hooks} from '../hooks';
import {svg} from '../assets/svg';
import {theme} from '../constants';
import {formatTHB} from '../utils/currency';
import {
  toPlainTextProductDescription,
  toRenderableProductRichTextHtml,
} from '../utils';
import {fetchLiveProducts, isFirmHiddenProduct} from '../utils/liveCatalog';
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

const appendImageCacheKey = (url: string, cacheKey: string): string => {
  if (!url || url.startsWith('data:image/') || url.startsWith('blob:')) {
    return url;
  }

  try {
    const parsed = new URL(
      url,
      typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1',
    );
    parsed.searchParams.set('__v', cacheKey);
    return parsed.toString();
  } catch (error) {
    console.error(error);
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}__v=${encodeURIComponent(cacheKey)}`;
  }
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

const buildMediaItems = (item: any, cacheKey: string): MediaItem[] => {
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
    media.push({type: 'image', url: appendImageCacheKey(url, cacheKey)});
  });

  if (!media.length && item.image) {
    media.push({
      type: 'image',
      url: appendImageCacheKey(item.image, cacheKey),
    });
  }

  return media;
};

export const Product: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = hooks.useAppDispatch();

  const routeItem = location.state?.item;
  const [item, setItem] = useState(
    isFirmHiddenProduct(routeItem) ? undefined : routeItem,
  );
  const mediaCacheKeyRef = useRef(
    `${routeItem?.productDetailId || routeItem?.id || 'product'}-${Date.now()}`,
  );

  const [reviewsData, setReviewsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedSize, setSelectedSize] = useState<string>(
    item?.sizes?.[0] || 'standard',
  );
  const [selectedColor, setSelectedColor] = useState<string>(
    item?.colors?.[0]?.name || 'default',
  );
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const videoFrameRef = useRef<HTMLIFrameElement | null>(null);
  const mediaScrollerRef = useRef<HTMLDivElement | null>(null);

  const modifiedItem = {
    ...item,
    color: selectedColor,
    size: selectedSize,
  };

  const mediaItems = buildMediaItems(item || {}, mediaCacheKeyRef.current);
  const descriptionHtml = toRenderableProductRichTextHtml(item?.description);
  const descriptionSummary =
    item?.shortDescription || toPlainTextProductDescription(item?.description);
  const descriptionHasEmbeddedMedia = /<img|<figure/i.test(descriptionHtml);
  const hasLongDescription =
    descriptionSummary.length > 260 ||
    descriptionHtml.length > 700 ||
    /<img|<figure|<ul|<ol|<h[1-4]/i.test(descriptionHtml);
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
    if (isFirmHiddenProduct(routeItem)) {
      setItem(undefined);
      navigate('/Shop', {replace: true});
      return;
    }

    setItem(routeItem);
    mediaCacheKeyRef.current = `${
      routeItem?.productDetailId || routeItem?.id || 'product'
    }-${Date.now()}`;
  }, [navigate, routeItem]);

  useEffect(() => {
    const targetId = String(routeItem?.productDetailId || routeItem?.id || '').trim();

    if (!targetId) {
      return;
    }

    let isMounted = true;

    fetchLiveProducts()
      .then((products) => {
        if (!isMounted) {
          return;
        }

        const latestProduct = products.find(
          (productItem) =>
            String(productItem.productDetailId || productItem.id) === targetId,
        );

        if (latestProduct) {
          setItem(latestProduct);
          mediaCacheKeyRef.current = `${targetId}-${Date.now()}`;
          return;
        }

        setItem(undefined);
        navigate('/Shop', {replace: true});
      })
      .catch((error) => {
        console.error('Unable to refresh product detail.', error);
      });

    return () => {
      isMounted = false;
    };
  }, [navigate, routeItem?.productDetailId, routeItem?.id]);

  useEffect(() => {
    window.scrollTo(0, 0);
    getReviews();
  }, []);

  useEffect(() => {
    setActiveMediaIndex(0);
    mediaScrollerRef.current?.scrollTo({left: 0, behavior: 'auto'});
    setIsDescriptionExpanded(false);
  }, [item?.productDetailId, item?.id]);

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
            flex: '0 0 100%',
            width: '100%',
            aspectRatio: '16 / 9',
            backgroundColor: '#000',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'stretch',
            scrollSnapAlign: 'start',
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
            flex: '0 0 100%',
            width: '100%',
            aspectRatio: '16 / 9',
            backgroundColor: '#f8fafc',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            scrollSnapAlign: 'start',
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
              backgroundColor: '#f8fafc',
              flex: 1,
            }}
          />
        </div>
    );
  };

  const renderMediaGallery = (): JSX.Element => {
    const scrollToMedia = (index: number) => {
      const scroller = mediaScrollerRef.current;

      if (!scroller) {
        return;
      }

      scroller.scrollTo({
        left: scroller.clientWidth * index,
        behavior: 'smooth',
      });
      setActiveMediaIndex(index);
    };

    const handleMediaScroll = () => {
      const scroller = mediaScrollerRef.current;

      if (!scroller || !scroller.clientWidth) {
        return;
      }

      const nextIndex = Math.round(scroller.scrollLeft / scroller.clientWidth);

      if (nextIndex !== activeMediaIndex) {
        setActiveMediaIndex(nextIndex);
      }
    };

    return (
      <section style={{marginBottom: 28}}>
        <div
          style={{
            width: '100%',
            aspectRatio: '16 / 9',
            backgroundColor: '#f8fafc',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            ref={mediaScrollerRef}
            onScroll={handleMediaScroll}
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              overflowX: 'auto',
              overflowY: 'hidden',
              scrollSnapType: 'x mandatory',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {mediaItems.map((media, index) => renderMediaSlide(media, index))}
          </div>

          {mediaItems.length > 1 ? (
            <div
              style={{
                position: 'absolute',
                left: '50%',
                bottom: 12,
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: 8,
                padding: '6px 10px',
                borderRadius: 999,
                backgroundColor: 'rgba(15, 23, 42, 0.35)',
              }}
            >
              {mediaItems.map((_, index) => (
                <button
                  key={`media-dot-${index}`}
                  type='button'
                  onClick={() => scrollToMedia(index)}
                  aria-label={`Go to media ${index + 1}`}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    backgroundColor:
                      index === activeMediaIndex
                        ? theme.colors.white
                        : 'rgba(255, 255, 255, 0.45)',
                  }}
                />
              ))}
            </div>
          ) : null}
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
              {descriptionSummary}
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
        <style>{`
          .wap-product-description img {
            display: block;
            width: auto !important;
            max-width: 100% !important;
            max-height: min(420px, 50vh) !important;
            height: auto !important;
            margin: 0 auto;
            object-fit: contain !important;
          }
          .wap-product-description figure {
            margin: 0 0 1rem;
            text-align: center;
          }
        `}</style>
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
          className='wap-product-description'
          style={{
            position: 'relative',
            padding: 22,
            backgroundColor: theme.colors.ghostWhite,
            color: theme.colors.textColor,
            lineHeight: 1.8,
            fontSize: 15,
            ...theme.fonts.Mulish_400Regular,
            maxHeight:
              hasLongDescription &&
              !isDescriptionExpanded &&
              !descriptionHasEmbeddedMedia
                ? 320
                : 'none',
            overflow: 'hidden',
          }}
          dangerouslySetInnerHTML={{
            __html: descriptionHtml || '<p>-</p>',
          }}
        />
        {hasLongDescription && !isDescriptionExpanded && !descriptionHasEmbeddedMedia ? (
          <div
            style={{
              marginTop: -72,
              height: 72,
              background:
                'linear-gradient(180deg, rgba(248,250,252,0) 0%, rgba(248,250,252,0.94) 45%, rgba(248,250,252,1) 100%)',
            }}
          />
        ) : null}
        {hasLongDescription ? (
          <button
            type='button'
            onClick={() => setIsDescriptionExpanded((current) => !current)}
            style={{
              marginTop: 14,
              border: 'none',
              backgroundColor: theme.colors.mainColor,
              color: '#fff',
              padding: '12px 18px',
              cursor: 'pointer',
              ...theme.fonts.Mulish_700Bold,
              fontSize: 14,
            }}
          >
            {isDescriptionExpanded ? 'ย่อรายละเอียด' : 'แสดงเพิ่มเติม'}
          </button>
        ) : null}
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
