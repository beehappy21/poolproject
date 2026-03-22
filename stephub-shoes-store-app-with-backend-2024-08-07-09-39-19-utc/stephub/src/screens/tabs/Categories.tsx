import {useEffect, useState, FC} from 'react';

import {hooks} from '../../hooks';
import {custom} from '../../custom';
import {theme} from '../../constants';
import {actions} from '../../store/actions';
import {components} from '../../components';
import {fetchLiveProducts, getPackageCollections} from '../../utils/liveCatalog';

export const Categories: FC = () => {
  const dispatch = hooks.useAppDispatch();
  const navigate = hooks.useAppNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [categoriesData, setCategoriesData] = useState<any>([]);

  const getData = async () => {
    setLoading(true);
    try {
      const products = await fetchLiveProducts();
      setCategoriesData(getPackageCollections(products));
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
                  return alert('No packages in this category yet.');
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
                  <span
                    style={{
                      color: theme.colors.white,
                      ...theme.fonts.Mulish_400Regular,
                      fontSize: 12,
                      lineHeight: 1.5,
                      opacity: 0.95,
                      marginTop: 4,
                    }}
                  >
                    {categoryProducts.length} package
                    {categoryProducts.length === 1 ? '' : 's'}
                  </span>
                </div>
              </custom.ImageBackground>
            </button>
          );
        })}
      </div>
    );
  };

  const renderContent = (): JSX.Element => {
    if (loading) return <components.TabLoader />;

    if (!categoriesData.length) {
      return (
        <div style={{paddingTop: 30, paddingBottom: 64 + 30, paddingLeft: 20, paddingRight: 20}}>
          <div
            style={{
              backgroundColor: theme.colors.ghostWhite,
              borderRadius: 16,
              padding: 20,
              color: theme.colors.textColor,
              lineHeight: 1.7,
            }}
          >
            No package collections are available right now.
          </div>
        </div>
      );
    }

    return (
      <div style={{paddingTop: 30, paddingBottom: 64 + 30}}>
        {renderCategories()}
      </div>
    );
  };

  const renderBottomTabBar = (): JSX.Element => {
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
