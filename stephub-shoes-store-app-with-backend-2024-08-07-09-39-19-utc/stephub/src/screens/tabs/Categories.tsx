import {useEffect, useState, FC} from 'react';

import {hooks} from '../../hooks';
import {custom} from '../../custom';
import {theme} from '../../constants';
import {actions} from '../../store/actions';
import {components} from '../../components';
import {fetchProductCollections} from '../../utils/liveCatalog';

const CATEGORIES_LOADING_FAILSAFE_MS = 12000;

export const Categories: FC = () => {
  const dispatch = hooks.useAppDispatch();
  const navigate = hooks.useAppNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [categoriesData, setCategoriesData] = useState<any>([]);
  const [loadError, setLoadError] = useState<string>('');

  const getData = async () => {
    setLoading(true);
    setLoadError('');
    try {
      setCategoriesData(await fetchProductCollections());
    } catch (error) {
      console.error(error);
      setLoadError('โหลดหมวดสินค้าช้ากว่าปกติ สามารถกดโหลดใหม่ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getData();
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!loading) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setLoading(false);
      setLoadError(currentError => currentError || 'โหลดหมวดสินค้าช้ากว่าปกติ สามารถกดโหลดใหม่ได้');
    }, CATEGORIES_LOADING_FAILSAFE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [loading]);

  const renderHeader = (): JSX.Element => {
    return <components.Header burger={true} basket={true} line={true} />;
  };

  const renderCategories = (): JSX.Element => {
    return (
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        {categoriesData?.map((item: any, index: number) => {
          const indexPlusOne = index + 1;
          const everyThird = indexPlusOne % 3 === 0;
          const categoryProducts = item.products || [];
          return (
            <button
              style={{
                position: 'relative',
                width: everyThird ? '100%' : 'calc(50% - 0.5px)',
              }}
              onClick={() => {
                if (categoryProducts.length === 0) {
                  return alert('ยังไม่มีสินค้าในหมวดนี้');
                }
                dispatch(actions.resetFilters());
                navigate('/Shop', {
                  state: {title: item.name, products: categoryProducts},
                });
              }}
            >
              <custom.ImageBackground
                key={item.id}
                style={{
                  justifyContent: 'flex-end',
                  height: everyThird ? 170 : 187,
                  width: '100%',
                  backgroundColor: '#F2F7FC',
                  backgroundSize: 'contain',
                }}
                imageUrl={item.image}
              >
                <div
                  style={{
                    flex: 1,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 1,
                    backgroundColor: `${theme.colors.mainColor}70`,
                  }}
                />

                <div style={{padding: 20, zIndex: 1, display: 'flex'}}>
                  <h4
                    style={{
                      margin: 0,
                      color: theme.colors.white,
                      ...theme.fonts.Mulish_600SemiBold,
                      fontSize: 18,
                      lineHeight: 1.2,
                    }}
                  >
                    {item.name}
                  </h4>
                </div>
              </custom.ImageBackground>
            </button>
          );
        })}
      </div>
    );
  };

  const renderContent = (): JSX.Element => {
    if (loading) {
      return (
        <div style={{paddingTop: 30, paddingBottom: 64 + 30, paddingLeft: 20, paddingRight: 20}}>
          <div
            style={{
              backgroundColor: '#EEF5FF',
              borderRadius: 16,
              padding: 20,
              color: theme.colors.mainColor,
              lineHeight: 1.7,
            }}
          >
            กำลังโหลดหมวดสินค้า...
          </div>
        </div>
      );
    }

    if (!categoriesData.length) {
      return (
        <div style={{paddingTop: 30, paddingBottom: 64 + 30, paddingLeft: 20, paddingRight: 20}}>
          {loadError ? (
            <div
              style={{
                backgroundColor: '#FFF4D6',
                borderRadius: 16,
                padding: 16,
                color: theme.colors.mainColor,
                lineHeight: 1.7,
                marginBottom: 12,
              }}
            >
              {loadError}
            </div>
          ) : null}
          <div
            style={{
              backgroundColor: theme.colors.ghostWhite,
              borderRadius: 16,
              padding: 20,
              color: theme.colors.textColor,
              lineHeight: 1.7,
            }}
          >
            ยังไม่มีหมวดสินค้าพร้อมใช้งานในขณะนี้
          </div>
        </div>
      );
    }

    return (
      <div style={{paddingTop: 30, paddingBottom: 64 + 30}}>
        {loadError ? (
          <div style={{paddingLeft: 20, paddingRight: 20, marginBottom: 12}}>
            <div
              style={{
                backgroundColor: '#FFF4D6',
                borderRadius: 16,
                padding: 16,
                color: theme.colors.mainColor,
                lineHeight: 1.7,
              }}
            >
              {loadError}
            </div>
          </div>
        ) : null}
        {renderCategories()}
      </div>
    );
  };

  return (
    <>
      {renderHeader()}
      {renderContent()}
    </>
  );
};
