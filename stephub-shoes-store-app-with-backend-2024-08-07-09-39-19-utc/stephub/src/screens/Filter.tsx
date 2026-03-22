import React, {useState, useEffect} from 'react';

import {hooks} from '../hooks';
import {svg} from '../assets/svg';
import {theme} from '../constants';
import {RootState} from '../store';
import {actions} from '../store/actions';
import {components} from '../components';
import {fetchLiveProducts} from '../utils/liveCatalog';

const labels = ['sale', 'new', 'top'];

export const Filter: React.FC = () => {
  const navigate = hooks.useAppNavigate();
  const dispatch = hooks.useAppDispatch();

  const [tags, setTags] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [colors, setColors] = useState([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const {selectedSizes, selectedColors, selectedTags, selectedCategories} =
    hooks.useAppSelector((state: RootState) => state.filterSlice);

  console.log('selectedColors --->', JSON.stringify(selectedColors, null, 2));

  console.log(selectedSizes);

  const getData = async () => {
    setIsLoading(true);

    try {
      const products = await fetchLiveProducts();

      let uniqueTags: any = [];
      let uniqueSizes: any = [];
      let uniqueColors: any = [];

      products.forEach((product: any) => {
        (product.colors || []).forEach((color: any) => {
          if (
            !uniqueColors.some(
              (uniqueColor: any) => uniqueColor.name === color.name,
            )
          ) {
            uniqueColors.push(color);
          }
        });
      });

      products.forEach((product: any) => {
        uniqueSizes = uniqueSizes.concat(product.sizes);
      });

      uniqueSizes = uniqueSizes.filter(
        (size: any, index: any) => uniqueSizes.indexOf(size) === index,
      );

      products.forEach((product: any) => {
        uniqueTags = uniqueTags.concat(product.tags);
      });

      uniqueTags = uniqueTags.filter(
        (size: any, index: any) => uniqueTags.indexOf(size) === index,
      );

      uniqueSizes = uniqueSizes.filter((size: any) => size !== 'standard');
      uniqueColors = uniqueColors.filter(
        (color: any) => color.name !== 'default',
      );

      setSizes(uniqueSizes);
      setColors(uniqueColors);
      setTags(uniqueTags);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    getData();
  }, []);

  const renderHeader = (): JSX.Element => {
    return <components.Header goBack={true} title='Filter' />;
  };

  const renderLabels = (): JSX.Element => {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 30,
        }}
      >
        {labels.map((item, index) => {
          return (
            <span
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                marginRight: 30,
                cursor: 'pointer',
              }}
              onClick={() => {
                dispatch((dispatch, getState) => {
                  const selectedCategories =
                    getState().filterSlice.selectedCategories;
                  if (selectedCategories.includes(item)) {
                    dispatch(
                      actions.setSelectedCategories(
                        selectedCategories.filter(
                          category => category !== item,
                        ),
                      ),
                    );
                  } else {
                    dispatch(
                      actions.setSelectedCategories([
                        ...selectedCategories,
                        item,
                      ]),
                    );
                  }
                });
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  border: '2px solid #E8EFF4',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 8,
                }}
              >
                {selectedCategories.includes(item) && <svg.InputCheckSvg />}
              </div>
              <div
                style={{
                  margin: 0,
                  padding: '0 6px',
                  display: 'flex',
                  borderRadius: 6,
                  backgroundColor:
                    item === 'sale'
                      ? '#51BA74'
                      : item === 'new'
                      ? '#F5C102'
                      : '#FF6262',
                }}
              >
                <span
                  style={{
                    textTransform: 'uppercase',
                    lineHeight: 1.7,
                    fontSize: 10,
                    color: theme.colors.white,
                    ...theme.fonts.Mulish_700Bold,
                    fontWeight: 'bold',
                  }}
                >
                  {item}
                </span>
              </div>
            </span>
          );
        })}
      </div>
    );
  };

  const renderSizes = (): JSX.Element => {
    if (!sizes.length) return <></>;

    return (
      <div style={{marginBottom: 40}}>
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
          {sizes?.map((item: string, index: number) => {
            return (
              <button
                key={index}
                style={{
                  width: 50,
                  height: 50,
                  backgroundColor: selectedSizes.includes(item)
                    ? theme.colors.mainColor
                    : theme.colors.imageBackground,
                  borderRadius: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onClick={() => {
                  dispatch((dispatch, getState) => {
                    const selectedSizes = getState().filterSlice.selectedSizes;
                    if (selectedSizes.includes(item)) {
                      dispatch(
                        actions.setSelectedSizes(
                          selectedSizes.filter(size => size !== item),
                        ),
                      );
                    } else {
                      dispatch(
                        actions.setSelectedSizes([...selectedSizes, item]),
                      );
                    }
                  });
                }}
              >
                <div
                  style={{
                    margin: 0,
                    padding: 0,
                    ...theme.fonts.Mulish_700Bold,
                    fontSize: 12,
                    color: selectedSizes.includes(item)
                      ? theme.colors.mainYellow
                      : theme.colors.mainColor,
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
    if (!colors.length) return <></>;

    return (
      <div
        style={{
          marginBottom: 40,
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
          {colors?.map((item: any, index: number) => {
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
                  dispatch((dispatch, getState) => {
                    const selectedColors =
                      getState().filterSlice.selectedColors;
                    if (selectedColors.includes(item.name)) {
                      dispatch(
                        actions.setSelectedColors(
                          selectedColors.filter(color => color !== item.name),
                        ),
                      );
                    } else {
                      dispatch(
                        actions.setSelectedColors([
                          ...selectedColors,
                          item.name,
                        ]),
                      );
                    }
                  });
                }}
              >
                {selectedColors.includes(item.name) && <svg.CheckSvg />}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTags = (): JSX.Element => {
    if (!tags.length) return <></>;

    return (
      <div style={{marginBottom: 40}}>
        <h5
          style={{
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 14,
            color: theme.colors.mainColor,
            ...theme.fonts.Mulish_600SemiBold,
          }}
        >
          Tags
        </h5>
        <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
          {tags.map((item, index) => {
            return (
              <span
                key={index}
                style={{
                  display: 'inline-block',
                  padding: '5px 20px',
                  borderRadius: 8,
                  backgroundColor: selectedTags.includes(item)
                    ? theme.colors.mainColor
                    : theme.colors.imageBackground,
                  ...theme.fonts.Mulish_700Bold,
                  fontWeight: 'bold',
                  fontSize: 12,
                  textTransform: 'capitalize',
                  color: selectedTags.includes(item)
                    ? theme.colors.mainYellow
                    : theme.colors.mainColor,
                  lineHeight: 1.7,
                }}
                onClick={() => {
                  dispatch((dispatch, getState) => {
                    const selectedTags = getState().filterSlice.selectedTags;
                    if (selectedTags.includes(item)) {
                      dispatch(
                        actions.setSelectedTags(
                          selectedTags.filter(tag => tag !== item),
                        ),
                      );
                    } else {
                      dispatch(
                        actions.setSelectedTags([...selectedTags, item]),
                      );
                    }
                  });
                }}
              >
                {item}
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  const renderButton = (): JSX.Element => {
    return (
      <components.Button
        title='apply filters'
        onClick={() => {
          navigate(-1);
        }}
      />
    );
  };

  const renderContent = (): JSX.Element => {
    if (isLoading) return <components.Loader />;

    return (
      <main style={{padding: '30px 20px 20px 20px'}}>
        {renderLabels()}
        {renderSizes()}
        {renderColors()}
        {renderTags()}
        {renderButton()}
      </main>
    );
  };

  return (
    <>
      {renderHeader()}
      {renderContent()}
    </>
  );
};
